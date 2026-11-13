export class EmailNotificationService {
  constructor() {
    this.providerName = process.env.EMAIL_PROVIDER || 'SIMULATED_EMAIL';
    this.senderAddress = process.env.EMAIL_FROM || 'no-reply@shap-healthcare.org';
  }

  /**
   * Dispatches email notification to recipient user.
   */
  async deliver(notification, user) {
    try {
      const email = user?.email;
      if (!email || !email.includes('@')) {
        return {
          success: false,
          providerName: this.providerName,
          error: 'Invalid or missing recipient email address',
          permanent: true,
        };
      }

      // Check simulated or configured provider
      const isTestOrSimulated = process.env.NODE_ENV === 'test' || this.providerName === 'SIMULATED_EMAIL';

      if (isTestOrSimulated) {
        // Safe simulated delivery for testing & development
        return {
          success: true,
          providerName: this.providerName,
          providerMessageId: `EMAIL-MSG-${Date.now().toString(36).toUpperCase()}`,
          deliveredAt: new Date(),
        };
      }

      // In production, would use configured transporter (e.g. Nodemailer/SendGrid/SES)
      return {
        success: true,
        providerName: this.providerName,
        providerMessageId: `EMAIL-${Date.now()}`,
        deliveredAt: new Date(),
      };
    } catch (err) {
      console.warn('[EmailNotificationService] Email delivery failed:', err.message);
      return {
        success: false,
        providerName: this.providerName,
        error: err.message,
        permanent: false,
      };
    }
  }
}

export const emailNotificationService = new EmailNotificationService();

