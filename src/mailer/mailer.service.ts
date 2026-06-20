import { Injectable } from '@nestjs/common';
import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';
import { HTMLGenerator } from 'src/util/htmlGenerator/htmlGenerator';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus } from 'src/generated/prisma/enums';

type EMAIL_TYPE =
  | 'VERIFY_EMAIL'
  | 'RESET_PASSWORD'
  | 'ORDER_CANCELLED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CREATED';

type AdminOrderEvent = EMAIL_TYPE | 'ORDER_STATUS_UPDATED';

@Injectable()
export class MailerService {
  private transporter: Transporter;

  constructor(private readonly prisma: PrismaService) {
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

  async sendHtmlMail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<SentMessageInfo> {
    return await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
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

  @OnEvent('admin.order.created')
  @OnEvent('admin.order.status.updated')
  async handleAdminOrderEmail(payload: {
    event: AdminOrderEvent;
    orderId: number;
    status: OrderStatus;
    customerName: string;
    customerEmail: string;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });
    const adminEmails = admins.map((admin) => admin.email).filter(Boolean);

    if (adminEmails.length === 0) return;

    const subject = this.getAdminOrderSubject(payload.event, payload.orderId);

    return this.sendHtmlMail(
      adminEmails,
      subject,
      HTMLGenerator.ADMIN_ORDER_NOTIFICATION('Admin', {
        orderId: payload.orderId,
        status: payload.status,
        event: payload.event,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
      }),
    );
  }

  private getAdminOrderSubject(event: AdminOrderEvent, orderId: number) {
    if (event === 'ORDER_CREATED') return `New Order Created #${orderId}`;
    if (event === 'ORDER_CANCELLED') return `Order Cancelled #${orderId}`;
    return `Order Status Updated #${orderId}`;
  }
}
