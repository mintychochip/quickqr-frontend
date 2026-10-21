import { expect, test } from '@playwright/test';
import { chooseType, decodedCode, generator } from './helpers';

test('a phone number goes straight into the code, with nothing to save', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.locator('#destination-url').fill('(555) 123-4567');

  const found = gen.getByTestId('detected-kind');
  await expect(found).toContainText('Phone number');
  await expect(found).toContainText('tel:5551234567');

  const card = gen.getByTestId('qr-card');
  const address = card.getByTestId('qr-encoded-value');
  await expect(address).toHaveText('tel:5551234567');
  await expect.poll(() => decodedCode(card)).toBe('tel:5551234567');

  await expect(gen.getByTestId('direct-note')).toBeVisible();
  await expect(gen.getByTestId('create-dynamic-link')).toHaveCount(0);

  // A phone number is not a web page: nothing to open or share as a link.
  await expect(address).not.toHaveAttribute('href');
  await expect(card.getByTestId('copy-qr-share')).toHaveCount(0);
  await expect(card.getByRole('button', { name: 'Copy' })).toBeVisible();
});

const typed: Array<[input: string, label: string, payload: string]> = [
  ['+44 20 7946 0958', 'Phone number', 'tel:+442079460958'],
  ['hello@example.com', 'Email', 'mailto:hello@example.com'],
  ['Table 4, patio', 'Text', 'Table 4, patio'],
  ['WIFI:S:Cafe;T:WPA;P:secret;;', 'Wi-Fi', 'WIFI:S:Cafe;T:WPA;P:secret;;'],
  ['37.7749, -122.4194', 'Location', 'geo:37.7749,-122.4194'],
  ['upi://pay?pa=jane@okbank&pn=Jane', 'UPI', 'upi://pay?pa=jane@okbank&pn=Jane'],
  ['bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.01', 'Crypto', 'bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.01'],
];

for (const [input, label, payload] of typed) {
  test(`${JSON.stringify(input)} is recognised as ${label} and encoded as ${JSON.stringify(payload)}`, async ({ page }) => {
    await page.goto('/');
    const gen = generator(page);
    await gen.locator('#destination-url').fill(input);

    await expect(gen.getByTestId('detected-kind')).toContainText(label);
    const card = gen.getByTestId('qr-card');
    await expect(card.getByTestId('qr-encoded-value')).toHaveText(payload);
    await expect.poll(() => decodedCode(card)).toBe(payload);
  });
}

test('a web address keeps the redirect flow and gets https', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.locator('#destination-url').fill('example.com/menu');

  const found = gen.getByTestId('detected-kind');
  await expect(found).toContainText('Link');
  await expect(found).toContainText('https://example.com/menu');

  await expect(gen.getByTestId('create-dynamic-link')).toBeVisible();
  await expect(gen.getByTestId('direct-note')).toHaveCount(0);
  await expect(gen.getByTestId('qr-card').getByTestId('qr-encoded-value')).toHaveText('Not saved yet');
});

test('the menu offers Auto-detect and all 17 types in four groups, with the current choice marked', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.getByTestId('type-menu').click();
  const menu = page.getByTestId('type-menu-content');

  await expect(menu.getByRole('menuitemradio')).toHaveText([
    'Auto-detect',
    'Link',
    'Text',
    'Phone number',
    'Text message',
    'Email',
    'WhatsApp',
    'Location',
    'Directions',
    'Event',
    'Wi-Fi',
    'Contact',
    'Social profile',
    'Google review',
    'Payment link',
    'Crypto',
    'Bank transfer',
    'UPI',
  ]);
  const groups: Record<string, string[]> = {
    Everyday: ['Link', 'Text', 'Phone number', 'Text message', 'Email', 'WhatsApp'],
    'Places & time': ['Location', 'Directions', 'Event'],
    Connect: ['Wi-Fi', 'Contact', 'Social profile', 'Google review'],
    Pay: ['Payment link', 'Crypto', 'Bank transfer', 'UPI'],
  };
  for (const [group, items] of Object.entries(groups)) {
    await expect(menu.getByRole('group', { name: group }).getByRole('menuitemradio')).toHaveText(items);
  }
  await expect(menu.getByRole('menuitemradio', { name: 'Auto-detect' })).toHaveAttribute('aria-checked', 'true');
  await expect(menu.getByRole('menuitemradio', { name: 'Link', exact: true })).toHaveAttribute('aria-checked', 'false');
});

test('choosing a type overrides a wrong guess, and Auto-detect undoes it', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');
  await gen.locator('#destination-url').fill('5551234567');
  await expect(gen.getByTestId('detected-kind')).toContainText('Phone number');
  await expect(gen.getByTestId('type-menu')).toHaveAccessibleName('Code type: Auto-detect, Phone number');

  await chooseType(gen, 'Text');
  await expect(gen.getByTestId('detected-kind')).toContainText('Text');
  await expect(gen.getByTestId('type-menu')).toHaveAccessibleName('Code type: Text');
  await expect(card.getByTestId('qr-encoded-value')).toHaveText('5551234567');
  await expect.poll(() => decodedCode(card)).toBe('5551234567');

  await gen.getByTestId('auto-detect').click();
  await expect(gen.getByTestId('detected-kind')).toContainText('Phone number');
  await expect(card.getByTestId('qr-encoded-value')).toHaveText('tel:5551234567');
  await expect(gen.getByTestId('type-menu')).toHaveAccessibleName('Code type: Auto-detect, Phone number');

  await chooseType(gen, 'Text');
  await chooseType(gen, 'Auto-detect');
  await expect(gen.getByTestId('detected-kind')).toContainText('Phone number');
});

test('a chosen type stays chosen when the box is emptied and filled again', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const box = gen.locator('#destination-url');
  await box.fill('5551234567');
  await chooseType(gen, 'Text');

  await box.fill('');
  await box.fill('(555) 123-4567');
  await expect(gen.getByTestId('detected-kind')).toContainText('Text');
  await expect(gen.getByTestId('qr-card').getByTestId('qr-encoded-value')).toHaveText('(555) 123-4567');
});

test('"Not right?" is offered for a guess, not for something that says what it is, and opens the menu', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const box = gen.locator('#destination-url');
  const notRight = gen.getByTestId('not-right');

  await box.fill('https://example.com/menu');
  await expect(gen.getByTestId('detected-kind')).toContainText('Link');
  await expect(notRight).toHaveCount(0);

  await box.fill('tel:+15551234567');
  await expect(gen.getByTestId('detected-kind')).toContainText('Phone number');
  await expect(notRight).toHaveCount(0);

  await box.fill('hello@example.com');
  await expect(notRight).toBeVisible();

  await box.fill('example.com/menu');
  await notRight.click();
  await expect(page.getByTestId('type-menu-content')).toBeVisible();
  await page.getByRole('menuitemradio', { name: 'Text', exact: true }).click();
  await expect(gen.getByTestId('detected-kind')).toContainText('Text');
  await expect(notRight).toHaveCount(0);
});

test('the menu works from the keyboard and hands focus back to the button', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const trigger = gen.getByTestId('type-menu');
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('type-menu-content')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('type-menu-content')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAccessibleName('Code type: Auto-detect, Link');

  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(trigger).toHaveAccessibleName('Code type: UPI');
  await expect(trigger).toBeFocused();
});

test('a chosen type relabels the bar and shows its own fields', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);

  await chooseType(gen, 'Text message');
  await expect(gen.getByLabel('Phone number')).toBeVisible();
  await expect(gen.getByTestId('type-fields').getByLabel('Message')).toBeVisible();

  await chooseType(gen, 'Contact');
  await expect(gen.getByLabel('Full name')).toBeVisible();
  for (const label of ['Company', 'Job title', 'Phone', 'Email', 'Website', 'Address', 'Note']) {
    await expect(gen.getByTestId('type-fields').getByLabel(label, { exact: true })).toBeVisible();
  }

  await chooseType(gen, 'Auto-detect');
  await expect(gen.getByLabel('Link, phone, email, or text')).toBeVisible();
  await expect(gen.getByTestId('type-fields')).toHaveCount(0);
});

test('choosing Link keeps the redirect flow, and refuses what is not a web address', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const box = gen.locator('#destination-url');
  await chooseType(gen, 'Link');

  await box.fill('example.com/menu');
  await expect(gen.getByTestId('detected-kind')).toContainText('https://example.com/menu');
  await expect(gen.getByTestId('create-dynamic-link')).toBeVisible();
  await expect(gen.getByTestId('not-right')).toHaveCount(0);

  await box.fill('hello world');
  await expect(gen.getByTestId('detected-kind')).toContainText('Enter a web address, like example.com/menu.');
  await expect(gen.getByTestId('create-dynamic-link')).toHaveCount(0);
});

test('what does not fit the chosen type is refused with the reason, and no code is offered', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');
  const box = gen.locator('#destination-url');
  await chooseType(gen, 'Phone number');

  await box.fill('call me');
  await expect(gen.getByTestId('detected-kind')).toContainText('Enter a phone number with 3 to 15 digits.');
  await expect(box).toHaveAttribute('aria-invalid', 'true');
  await expect(card.getByTestId('qr-encoded-value')).toHaveText('Not saved yet');
  await expect(gen.getByTestId('direct-note')).toHaveCount(0);
  await expect(gen.getByTestId('create-dynamic-link')).toHaveCount(0);

  await gen.getByRole('tab', { name: 'Static', exact: true }).click();
  const staticBox = gen.locator('#static-url');
  await expect(staticBox).toHaveAttribute('aria-invalid', 'true');
  await expect(card.getByTestId('qr-encoded-value')).toHaveText('Nothing to encode yet');
  await expect(card.getByRole('button', { name: 'Copy' })).toHaveCount(0);
  await expect(gen.getByTestId('static-compressed-url')).toHaveCount(0);

  await staticBox.fill('555 123 4567');
  await expect(staticBox).not.toHaveAttribute('aria-invalid', 'true');
  await expect.poll(() => decodedCode(card)).toBe('tel:5551234567');
  await expect(card.getByRole('button', { name: 'Copy' })).toBeVisible();
});

test('Wi-Fi: the network name goes in the bar, the rest under it, and the code carries them', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');
  await chooseType(gen, 'Wi-Fi');
  await expect(gen.getByLabel('Network name')).toBeVisible();

  await gen.locator('#destination-url').fill('Cafe Guest');
  await gen.locator('#destination-url-password').fill('secret123');
  await expect(card.getByTestId('qr-encoded-value')).toHaveText('WIFI:T:WPA;S:Cafe Guest;P:secret123;;');
  await expect.poll(() => decodedCode(card)).toBe('WIFI:T:WPA;S:Cafe Guest;P:secret123;;');
  await expect(gen.getByTestId('direct-note')).toBeVisible();
  await expect(gen.getByTestId('type-note')).toContainText('Anyone who can scan');

  await gen.getByRole('checkbox', { name: 'Hidden network' }).check();
  await expect.poll(() => decodedCode(card)).toBe('WIFI:T:WPA;S:Cafe Guest;P:secret123;H:true;;');

  await gen.locator('#destination-url-security').selectOption('nopass');
  await expect(gen.locator('#destination-url-password')).toHaveCount(0);
  await expect.poll(() => decodedCode(card)).toBe('WIFI:T:nopass;S:Cafe Guest;H:true;;');

  await gen.locator('#destination-url-security').selectOption('WPA');
  await expect(gen.locator('#destination-url-password')).toHaveValue('secret123');
  await expect.poll(() => decodedCode(card)).toBe('WIFI:T:WPA;S:Cafe Guest;P:secret123;H:true;;');

  await gen.locator('#destination-url-password').fill('short');
  await expect(gen.getByTestId('detected-kind')).toContainText('WPA passwords are 8 to 63 characters.');
});

test('Text message and WhatsApp: the message is encoded into the link the code opens', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');

  await chooseType(gen, 'Text message');
  await gen.locator('#destination-url').fill('+1 555 123 4567');
  await gen.locator('#destination-url-message').fill('Hi! Table for 2 & a cot?');
  await expect.poll(() => decodedCode(card)).toBe('sms:+15551234567?body=Hi!%20Table%20for%202%20%26%20a%20cot%3F');

  await chooseType(gen, 'WhatsApp');
  await expect(gen.locator('#destination-url-message')).toHaveValue('');
  await gen.locator('#destination-url-message').fill('Hello');
  await expect.poll(() => decodedCode(card)).toBe('https://wa.me/15551234567?text=Hello');

  await gen.locator('#destination-url').fill('555 123 4567');
  await expect(gen.getByTestId('detected-kind')).toContainText('Start with + and the country code');
});

test('what was typed under the bar is kept for its type and never carried to another', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.locator('#destination-url').fill('+1 555 123 4567');

  await chooseType(gen, 'Text message');
  await gen.locator('#destination-url-message').fill('Hello from SMS');
  await chooseType(gen, 'WhatsApp');
  await expect(gen.locator('#destination-url-message')).toHaveValue('');
  await gen.locator('#destination-url-message').fill('Hello from WhatsApp');

  await chooseType(gen, 'Text message');
  await expect(gen.locator('#destination-url-message')).toHaveValue('Hello from SMS');
  await chooseType(gen, 'WhatsApp');
  await expect(gen.locator('#destination-url-message')).toHaveValue('Hello from WhatsApp');
});

test('Event: timed and all-day events write their own calendar entry, and the hint does not echo it', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');
  await chooseType(gen, 'Event');
  await gen.locator('#destination-url').fill('Spring tasting');
  await expect(gen.getByTestId('detected-kind')).toContainText('Pick when the event starts.');

  await gen.locator('#destination-url-starts').fill('2026-10-21T18:00');
  await gen.locator('#destination-url-ends').fill('2026-10-21T20:00');
  await gen.locator('#destination-url-place').fill('Main Hall');
  const timed = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//quickqr.app//EN',
    'BEGIN:VEVENT',
    'SUMMARY:Spring tasting',
    'DTSTART:20261021T180000',
    'DTEND:20261021T200000',
    'LOCATION:Main Hall',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  await expect.poll(() => decodedCode(card)).toBe(timed);
  await expect(gen.getByTestId('detected-kind')).not.toContainText('BEGIN');
  await expect(gen.getByTestId('detected-kind')).toContainText('Event');

  await gen.getByRole('checkbox', { name: 'All-day event' }).check();
  await expect(gen.locator('#destination-url-starts')).toHaveCount(0);
  await expect(gen.getByTestId('detected-kind')).toContainText('Pick the day the event starts.');
  await gen.locator('#destination-url-startDate').fill('2026-10-21');
  await expect
    .poll(() => decodedCode(card))
    .toBe(timed.replace('DTSTART:20261021T180000\r\nDTEND:20261021T200000', 'DTSTART;VALUE=DATE:20261021\r\nDTEND;VALUE=DATE:20261022'));
});

test('Bank transfer: a wrong IBAN is refused, a right one is written as an EPC payment code', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');
  await chooseType(gen, 'Bank transfer');
  await gen.locator('#destination-url').fill('Jane Doe');
  await expect(gen.getByTestId('type-note')).toContainText('Scan the code with your banking app');

  await gen.locator('#destination-url-iban').fill('DE89 3704 0044 0532 0130 01');
  await expect(gen.getByTestId('detected-kind')).toContainText('That IBAN does not pass its check.');
  await expect(card.getByTestId('qr-encoded-value')).toHaveText('Not saved yet');

  await gen.locator('#destination-url-iban').fill('DE89 3704 0044 0532 0130 00');
  await gen.locator('#destination-url-amount').fill('12.5');
  await gen.locator('#destination-url-reference').fill('Invoice 42');
  const epc = ['BCD', '002', '1', 'SCT', '', 'Jane Doe', 'DE89370400440532013000', 'EUR12.50', '', '', 'Invoice 42'].join('\n');
  await expect.poll(() => decodedCode(card)).toBe(epc);
});

test('Payment link: each service gets its own link, which can be opened to check it', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');
  await chooseType(gen, 'Payment link');
  await expect(gen.getByTestId('type-note')).toContainText('Scan the code yourself before sharing it');
  await gen.locator('#destination-url').fill('@jane');

  await gen.locator('#destination-url-amount').fill('12.50');
  await gen.locator('#destination-url-currency').selectOption('EUR');
  await expect.poll(() => decodedCode(card)).toBe('https://paypal.me/jane/12.50EUR');
  await expect(card.getByTestId('qr-encoded-value')).toHaveAttribute('href', 'https://paypal.me/jane/12.50EUR');

  await gen.locator('#destination-url-service').selectOption('cashapp');
  await expect(gen.locator('#destination-url-currency')).toHaveCount(0);
  await expect.poll(() => decodedCode(card)).toBe('https://cash.app/$jane/12.50');

  await gen.locator('#destination-url-service').selectOption('venmo');
  await expect(gen.locator('#destination-url-amount')).toHaveCount(0);
  await expect.poll(() => decodedCode(card)).toBe('https://venmo.com/u/jane');
});

test('a chosen type and what was typed under the bar carry over to the Static tab', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const card = gen.getByTestId('qr-card');
  await chooseType(gen, 'Wi-Fi');
  await gen.locator('#destination-url').fill('Cafe Guest');
  await gen.locator('#destination-url-password').fill('secret123');

  await gen.getByRole('tab', { name: 'Static', exact: true }).click();
  await expect(gen.getByLabel('Network name')).toBeVisible();
  await expect(gen.locator('#static-url')).toHaveValue('Cafe Guest');
  await expect(gen.locator('#static-url-password')).toHaveValue('secret123');
  await expect.poll(() => decodedCode(card)).toBe('WIFI:T:WPA;S:Cafe Guest;P:secret123;;');

  await gen.getByRole('tab', { name: 'Dynamic', exact: true }).click();
  await expect(gen.locator('#destination-url-password')).toHaveValue('secret123');
});

test('the Static tab encodes a phone number directly and still compresses links', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.getByRole('tab', { name: 'Static', exact: true }).click();
  const box = gen.locator('#static-url');
  const card = gen.getByTestId('qr-card');

  await box.fill('555-123-4567');
  await expect(gen.getByTestId('detected-kind')).toContainText('Phone number');
  await expect(card.getByTestId('qr-encoded-value')).toHaveText('tel:5551234567');
  await expect.poll(() => decodedCode(card)).toBe('tel:5551234567');
  await expect(gen.getByTestId('static-compressed-url')).toHaveCount(0);
  await expect(gen.getByTestId('direct-note')).toBeVisible();

  await box.fill('https://example.com/events/spring-menu?table=4');
  await expect(gen.getByTestId('detected-kind')).toContainText('Link');
  await expect(gen.getByTestId('direct-note')).toHaveCount(0);
  await expect(gen.getByTestId('static-compressed-url')).toContainText('HTTP');
  await expect(card.getByTestId('qr-encoded-value')).toContainText('HTTP');
});

test('the box keeps what was typed when switching between Dynamic and Static', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.locator('#destination-url').fill('hello@example.com');

  await gen.getByRole('tab', { name: 'Static', exact: true }).click();
  await expect(gen.locator('#static-url')).toHaveValue('hello@example.com');
  await expect(gen.getByTestId('detected-kind')).toContainText('Email');

  await gen.getByRole('tab', { name: 'Dynamic', exact: true }).click();
  await expect(gen.locator('#destination-url')).toHaveValue('hello@example.com');
});

test('text that cannot fit in a code is refused instead of drawing a stale one', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.locator('#destination-url').fill('a'.repeat(1001));

  await expect(gen.getByTestId('detected-kind')).toContainText('Too long');
  await expect(gen.getByTestId('qr-card').getByTestId('qr-encoded-value')).not.toContainText('aaaa');
  await expect(gen.getByTestId('create-dynamic-link')).toHaveCount(0);
});
