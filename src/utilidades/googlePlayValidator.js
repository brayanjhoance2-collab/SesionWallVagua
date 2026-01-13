const { google } = require('googleapis');

class GooglePlayValidator {
  constructor() {
    this.androidPublisher = null;
    this.packageName = 'com.wall.vaguada';
  }

  async initialize() {
    if (this.androidPublisher) {
      return;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
      });

      const authClient = await auth.getClient();
      
      this.androidPublisher = google.androidpublisher({
        version: 'v3',
        auth: authClient
      });

      console.log('Google Play API inicializada correctamente');
    } catch (error) {
      console.error('Error inicializando Google Play API:', error.message);
      throw error;
    }
  }

  async verifySubscription(purchaseToken, productId) {
    try {
      if (!this.androidPublisher) {
        await this.initialize();
      }

      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName: this.packageName,
        subscriptionId: productId,
        token: purchaseToken
      });

      const subscription = response.data;

      const isValid = subscription.paymentState === 1;
      const expiryTime = parseInt(subscription.expiryTimeMillis);
      const isExpired = expiryTime < Date.now();
      const autoRenewing = subscription.autoRenewing === true;

      return {
        isValid: isValid && !isExpired,
        subscription: {
          orderId: subscription.orderId,
          purchaseToken: purchaseToken,
          productId: productId,
          packageName: this.packageName,
          purchaseTime: parseInt(subscription.startTimeMillis),
          expiryTime: expiryTime,
          autoRenewing: autoRenewing,
          paymentState: subscription.paymentState,
          cancelReason: subscription.cancelReason,
          userCancellationTime: subscription.userCancellationTimeMillis ? parseInt(subscription.userCancellationTimeMillis) : null,
          priceAmountMicros: subscription.priceAmountMicros,
          priceCurrencyCode: subscription.priceCurrencyCode,
          countryCode: subscription.countryCode,
          rawResponse: subscription
        }
      };
    } catch (error) {
      console.error('Error verificando suscripción con Google:', error.message);
      
      if (error.code === 404) {
        return {
          isValid: false,
          error: 'Suscripción no encontrada'
        };
      }

      if (error.code === 401) {
        return {
          isValid: false,
          error: 'Error de autenticación con Google Play'
        };
      }

      throw error;
    }
  }

  async getSubscriptionStatus(purchaseToken, productId) {
    const result = await this.verifySubscription(purchaseToken, productId);
    
    if (!result.isValid) {
      return {
        status: 'invalid',
        ...result
      };
    }

    const subscription = result.subscription;
    const now = Date.now();

    if (subscription.expiryTime < now) {
      return {
        status: 'expired',
        ...result
      };
    }

    if (subscription.cancelReason) {
      return {
        status: 'cancelled',
        ...result
      };
    }

    if (subscription.autoRenewing) {
      return {
        status: 'active_renewing',
        ...result
      };
    }

    return {
      status: 'active',
      ...result
    };
  }

  getPlanType(productId) {
    const planMap = {
      'premium_weekly': 'semanal',
      'premium_monthly': 'mensual',
      'premium_yearly': 'anual'
    };
    return planMap[productId] || 'desconocido';
  }

  calculateExpiryDate(purchaseTime, planType) {
    const date = new Date(purchaseTime);
    
    switch(planType) {
      case 'semanal':
        date.setDate(date.getDate() + 7);
        break;
      case 'mensual':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'anual':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date;
  }
}

const googlePlayValidator = new GooglePlayValidator();

module.exports = googlePlayValidator;