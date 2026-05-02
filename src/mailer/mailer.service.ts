import { Injectable } from '@nestjs/common';
import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';
import { HTMLGenerator } from 'src/util/htmlGenerator/htmlGenerator';
type EMAIL_TYPE = 'VERIFY_EMAIL' | 'RESET_PASSWORD';
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
    token: string,
    subject: string,
    type: EMAIL_TYPE = 'VERIFY_EMAIL',
  ): Promise<SentMessageInfo> {
    return await await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: HTMLGenerator[type](name, token),
    });
  }
}
