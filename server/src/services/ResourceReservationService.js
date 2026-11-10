import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { getSocketIO } from '../sockets/socketHandler.js';

export class ResourceReservationService {
  /**
   * Patient selects destination hospital among the accepted responses.
   */
  async selectDestination(emergencyRequestId, organizationId, patientUserId) {
    const request = await emergencyRepository.findRequestById(emergencyRequestId);
    if (!request) throw new Error('Emergency request not found');

    if (request.patientId._id.toString() !== patientUserId.toString()) {
      throw new Error('Unauthorized to select destination for this emergency');
    }

    // Verify that this organization was broadcasted and accepted or is valid
    const broadcast = await emergencyRepository.getBroadcastForOrg(emergencyRequestId, organizationId);
    if (!broadcast) {
      throw new Error('This organization was not part of the emergency broadcast');
    }

    // Update status to DESTINATION_SELECTED
    const updated = await emergencyRepository.selectDestination(emergencyRequestId, organizationId);

    // Notify organization that they were chosen as final destination
    const io = getSocketIO();
    if (io) {
      io.to(`org:${organizationId}`).emit('emergency:destination_confirmed', {
        emergencyRequestId,
        patientName: request.patientName,
        patientPhone: request.patientPhone,
        emergencyType: request.emergencyType,
        status: 'DESTINATION_SELECTED',
      });

      io.to(`emergency:${emergencyRequestId}`).emit('emergency:status_change', {
        status: 'DESTINATION_SELECTED',
        selectedOrganizationId: organizationId,
      });
    }

    return updated;
  }

  /**
   * Final organization confirmation & TEMPORARY RESOURCE RESERVATION.
   * Business rule: Temporary reservation happens ONLY after destination confirmation!
   */
  async confirmAndReserveResource(emergencyRequestId, organizationId, resourceType = 'er_bay') {
    const request = await emergencyRepository.findRequestById(emergencyRequestId);
    if (!request) throw new Error('Emergency request not found');

    if (
      !request.selectedOrganizationId ||
      request.selectedOrganizationId._id.toString() !== organizationId.toString()
    ) {
      throw new Error('This organization is not the selected destination for this emergency');
    }

    // Check if reservation already exists
    const existingRes = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (existingRes) {
      return {
        success: true,
        message: 'Resource is already reserved',
        reservation: existingRes,
      };
    }

    // Attempt ATOMIC reservation on the chosen resource type
    const updatedResource = await resourceRepository.atomicReserve(organizationId, resourceType, 1);
    if (!updatedResource) {
      // Fallback try er_bay if icu_bed was unavailable
      const fallbackResource = await resourceRepository.atomicReserve(organizationId, 'er_bay', 1);
      if (!fallbackResource) {
        throw new Error('Unable to reserve resource: Selected facility has reached maximum capacity.');
      }
      resourceType = 'er_bay';
    }

    // Expiry duration from environment or 15 minutes default
    const expiryMinutes = parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '15', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const reservation = await resourceRepository.createReservation({
      emergencyRequestId,
      organizationId,
      resourceId: updatedResource ? updatedResource._id : null,
      resourceType,
      quantity: 1,
      status: 'TEMPORARILY_RESERVED',
      expiresAt,
    });

    // Update Emergency Request Status to RESOURCES_RESERVED
    await emergencyRepository.updateRequestStatus(
      emergencyRequestId,
      'RESOURCES_RESERVED',
      `Temporary reservation of ${resourceType} confirmed. Hold expires in ${expiryMinutes} minutes.`
    );

    // Real-time notification
    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:resource_reserved', {
        emergencyRequestId,
        reservationId: reservation._id,
        resourceType,
        expiresAt,
        status: 'RESOURCES_RESERVED',
      });
    }

    return {
      success: true,
      message: `Resource ${resourceType} temporarily reserved for ${expiryMinutes} minutes`,
      reservation,
    };
  }

  /**
   * Patient transitions to en-route
   */
  async markPatientEnRoute(emergencyRequestId, patientUserId) {
    const request = await emergencyRepository.findRequestById(emergencyRequestId);
    if (!request) throw new Error('Emergency request not found');

    const updated = await emergencyRepository.updateRequestStatus(
      emergencyRequestId,
      'PATIENT_EN_ROUTE',
      'Patient is en route to the destination hospital'
    );

    const activeRes = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (activeRes) {
      await resourceRepository.updateReservationStatus(activeRes._id, 'PATIENT_EN_ROUTE');
    }

    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:status_change', {
        status: 'PATIENT_EN_ROUTE',
        emergencyRequestId,
      });
      if (request.selectedOrganizationId) {
        io.to(`org:${request.selectedOrganizationId._id}`).emit('emergency:patient_en_route', {
          emergencyRequestId,
          status: 'PATIENT_EN_ROUTE',
        });
      }
    }

    return updated;
  }

  /**
   * Patient arrives at hospital -> Hospital marks ARRIVED / ALLOCATES resource
   */
  async markPatientArrived(emergencyRequestId, organizationId) {
    const request = await emergencyRepository.findRequestById(emergencyRequestId);
    if (!request) throw new Error('Emergency request not found');

    const updated = await emergencyRepository.updateRequestStatus(
      emergencyRequestId,
      'ARRIVED',
      'Patient has arrived at emergency facility reception'
    );

    // Atomically transition resource from reserved to allocated
    const activeRes = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (activeRes) {
      await resourceRepository.atomicAllocate(organizationId, activeRes.resourceType, 1);
      await resourceRepository.updateReservationStatus(activeRes._id, 'ALLOCATED', {
        allocatedAt: new Date(),
      });
    }

    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:status_change', {
        status: 'ARRIVED',
        emergencyRequestId,
      });
    }

    return updated;
  }

  /**
   * Cancels emergency and releases any reserved resources
   */
  async cancelEmergency(emergencyRequestId, reason = 'Cancelled by patient') {
    const request = await emergencyRepository.findRequestById(emergencyRequestId);
    if (!request) throw new Error('Emergency request not found');

    const activeRes = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (activeRes) {
      await resourceRepository.atomicRelease(activeRes.organizationId, activeRes.resourceType, 1);
      await resourceRepository.updateReservationStatus(activeRes._id, 'RELEASED', {
        releasedAt: new Date(),
        releaseReason: reason,
      });
    }

    const updated = await emergencyRepository.updateRequestStatus(
      emergencyRequestId,
      'CANCELLED',
      `Emergency cancelled. Reason: ${reason}`
    );

    const io = getSocketIO();
    if (io) {
      io.to(`emergency:${emergencyRequestId}`).emit('emergency:status_change', {
        status: 'CANCELLED',
        emergencyRequestId,
      });
      if (request.selectedOrganizationId) {
        io.to(`org:${request.selectedOrganizationId._id}`).emit('emergency:cancelled', {
          emergencyRequestId,
          reason,
        });
      }
    }

    return updated;
  }

  /**
   * Periodic check: Releases expired reservations automatically.
   */
  async checkAndReleaseExpiredReservations() {
    const expiredList = await resourceRepository.findExpiredReservations();
    for (const res of expiredList) {
      await resourceRepository.atomicRelease(res.organizationId, res.resourceType, res.quantity);
      await resourceRepository.updateReservationStatus(res._id, 'EXPIRED', {
        releasedAt: new Date(),
        releaseReason: 'Reservation hold time expired without arrival',
      });

      await emergencyRepository.updateRequestStatus(
        res.emergencyRequestId,
        'RESERVATION_RELEASED',
        'Temporary resource reservation expired and was released'
      );

      const io = getSocketIO();
      if (io) {
        io.to(`emergency:${res.emergencyRequestId}`).emit('emergency:status_change', {
          status: 'RESERVATION_RELEASED',
          emergencyRequestId: res.emergencyRequestId,
        });
      }
    }
  }
}

export const resourceReservationService = new ResourceReservationService();

