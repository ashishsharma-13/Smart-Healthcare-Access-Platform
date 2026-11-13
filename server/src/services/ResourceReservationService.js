import { emergencyRepository } from '../repositories/EmergencyRepository.js';
import { resourceRepository } from '../repositories/ResourceRepository.js';
import { destinationSelectionService } from './DestinationSelectionService.js';
import { getSocketIO } from '../sockets/socketHandler.js';

export class ResourceReservationService {
  /**
   * Patient selects destination hospital among the accepted responses.
   */
  async selectDestination(emergencyRequestId, organizationId, patientUserId) {
    const res = await destinationSelectionService.selectDestination({
      emergencyRequestId,
      organizationId,
      userId: patientUserId,
      source: 'USER',
    });
    return await res.emergencyRequest.populate('selectedOrganizationId');
  }

  /**
   * Final organization confirmation & TEMPORARY RESOURCE RESERVATION.
   * Business rule: Temporary reservation happens ONLY after destination confirmation!
   */
  async confirmAndReserveResource(emergencyRequestId, organizationId, resourceType = 'er_bay') {
    // Find active selection
    const request = await emergencyRepository.findRequestById(emergencyRequestId);
    if (!request) throw new Error('Emergency request not found');

    const selectionId = request.destinationSelectionId;
    if (!selectionId) {
      throw new Error('No destination selection found for this emergency request');
    }

    const res = await destinationSelectionService.confirmDestination({
      selectionId,
      organizationId,
      requiredResources: [{ resourceType, quantity: 1 }],
    });

    return {
      success: true,
      message: `Resource ${resourceType} temporarily reserved for 15 minutes`,
      reservation: res.reservation,
      selection: res.selection,
    };
  }

  /**
   * Patient transitions to en-route
   */
  async markPatientEnRoute(emergencyRequestId, patientUserId) {
    const res = await destinationSelectionService.confirmPatientEnRoute(emergencyRequestId, patientUserId);
    return res.emergencyRequest;
  }

  /**
   * Patient arrives at hospital -> Hospital marks ARRIVED / ALLOCATES resource
   */
  async markPatientArrived(emergencyRequestId, organizationId) {
    const reservation = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (!reservation) {
      return await emergencyRepository.updateRequestStatus(
        emergencyRequestId,
        'ARRIVED',
        'Patient has arrived at emergency facility reception'
      );
    }

    await destinationSelectionService.markPatientArrived({
      reservationId: reservation._id,
      organizationId,
    });

    return await emergencyRepository.findRequestById(emergencyRequestId);
  }

  /**
   * Cancels emergency and releases any reserved resources
   */
  async cancelEmergency(emergencyRequestId, reason = 'Cancelled by patient') {
    const reservation = await resourceRepository.findActiveReservationForRequest(emergencyRequestId);
    if (reservation) {
      await destinationSelectionService.releaseReservation({
        reservationId: reservation._id,
        reason,
      });
    }

    return await emergencyRepository.updateRequestStatus(
      emergencyRequestId,
      'CANCELLED',
      `Emergency cancelled. Reason: ${reason}`
    );
  }

  /**
   * Periodic check: Releases expired reservations automatically.
   */
  async checkAndReleaseExpiredReservations() {
    return await destinationSelectionService.checkAndReleaseExpiredReservations();
  }
}

export const resourceReservationService = new ResourceReservationService();
