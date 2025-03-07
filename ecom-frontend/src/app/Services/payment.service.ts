import { Injectable } from '@angular/core';
import { OrderService } from '../Admin/Modules/orders/order.service';

declare var Razorpay: any;

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(private orderService: OrderService) {}

  /** Method to initiate payment */
  payWithRazorpay(
    amount: number,
    currency: string,
    orderDetails: any,
    callback: Function
  ) {
    const options = {
      key: 'rzp_test_2ZWOz5sEOhPm6M', // Replace with Razorpay Key ID
      amount: amount * 100, // Convert amount to paise
      currency: currency,
      name: 'DopeShope',
      description: 'Order Payment',
      handler: (response: any) => {
        console.log('Payment Success:', response);

        // Once payment is successful, create an order
        const newOrder = {
          userId: orderDetails.userId,
          customerName: orderDetails.customerName,
          totalAmount: orderDetails.totalAmount,
          products: orderDetails.products,
          status: 'Pending', // Default order status
        };

        this.orderService.createOrder(newOrder).subscribe(
          (order) => {
            console.log('Order Created:', order);
            callback(order); // Call callback with order details
          },
          (error) => {
            console.error('Order Creation Failed:', error);
          }
        );
      },
      prefill: {
        name: 'Praveen Sharma',
        email: 'soulmortal1084@gmail.com',
        contact: '9116577183',
      },
      theme: {
        color: '#3399cc',
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }
}
