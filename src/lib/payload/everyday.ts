import { query } from './format';
import { dialled, isEmail, phoneNumber, webAddress } from './syntax';
import type { QrType } from './types';

export const everydayTypes: readonly QrType[] = [
  {
    id: 'link',
    label: 'Link',
    group: 'everyday',
    bar: { label: 'Web address', placeholder: 'yoursite.com/menu', inputMode: 'url' },
    fields: [],
    build(bar) {
      const address = webAddress(bar);
      return address ? { payload: address } : { problem: 'Enter a web address, like example.com/menu.' };
    },
  },
  {
    id: 'text',
    label: 'Text',
    group: 'everyday',
    bar: { label: 'Text', placeholder: 'Anything you want the code to say' },
    fields: [],
    build: (bar) => ({ payload: bar }),
  },
  {
    id: 'phone',
    label: 'Phone number',
    group: 'everyday',
    bar: { label: 'Phone number', placeholder: '+1 555 123 4567', inputMode: 'tel' },
    fields: [],
    build(bar) {
      // Three digits: a person who chose Phone number may mean 911 or an extension, which auto-detection never guesses.
      const number = phoneNumber(bar, 3);
      return number ? { payload: `tel:${dialled(number)}` } : { problem: 'Enter a phone number with 3 to 15 digits.' };
    },
  },
  {
    id: 'sms',
    label: 'Text message',
    group: 'everyday',
    bar: { label: 'Phone number', placeholder: '+1 555 123 4567', inputMode: 'tel' },
    fields: [{ key: 'message', label: 'Message', control: 'text', placeholder: 'Hi! Can I book a table?' }],
    build(bar, values) {
      const number = phoneNumber(bar, 3);
      if (!number) return { problem: 'Enter the phone number to text, with 3 to 15 digits.' };
      return { payload: `sms:${dialled(number)}${query([['body', values.message!]])}` };
    },
  },
  {
    id: 'email',
    label: 'Email',
    group: 'everyday',
    bar: { label: 'Email address', placeholder: 'name@example.com', inputMode: 'email' },
    fields: [
      { key: 'subject', label: 'Subject', control: 'text' },
      { key: 'body', label: 'Message', control: 'text' },
    ],
    build(bar, values) {
      if (!isEmail(bar)) return { problem: 'Enter an email address, like name@example.com.' };
      return { payload: `mailto:${bar}${query([['subject', values.subject!], ['body', values.body!]])}` };
    },
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    group: 'everyday',
    bar: { label: 'Phone number with country code', placeholder: '+1 555 123 4567', inputMode: 'tel' },
    fields: [{ key: 'message', label: 'Message', control: 'text', placeholder: 'Hi! I found you on your flyer.' }],
    build(bar, values) {
      // wa.me wants the full international number. Without the +, a local number would make a link that fails silently.
      const number = phoneNumber(bar, 7);
      if (!number?.plus) return { problem: 'Start with + and the country code, like +1 555 123 4567.' };
      return { payload: `https://wa.me/${number.digits}${query([['text', values.message!]])}` };
    },
  },
];
