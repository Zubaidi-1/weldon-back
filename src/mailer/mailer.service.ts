import { Injectable } from '@nestjs/common';
import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';
import { HTMLGenerator } from 'src/util/htmlGenerator/htmlGenerator';
import { OnEvent } from '@nestjs/event-emitter';
type EMAIL_TYPE =
  | 'VERIFY_EMAIL'
  | 'RESET_PASSWORD'
  | 'ORDER_CANCELLED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CREATED';

@Injectable()
export class MailerService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });
  }

  //   We can reuse the same email
  //   Used for anything with a token for now

  async sendMail(
    to: string,
    name: string,
    data: string | number,
    subject: string,
    type: EMAIL_TYPE = 'VERIFY_EMAIL',
  ): Promise<SentMessageInfo> {
    return await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: HTMLGenerator[type](name, data),
    });
  }

  @OnEvent('order.created')
  @OnEvent('order.status.updated')
  async handleOrderEmail(payload: {
    event: EMAIL_TYPE;
    email: string;
    name: string;
    orderId: number;
  }) {
    const subject = payload.event
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return this.sendMail(
      payload.email,
      payload.name,
      payload.orderId,
      subject,
      payload.event,
    );
  }
}
