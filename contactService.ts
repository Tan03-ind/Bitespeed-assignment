import { prisma } from './db';

export async function identifyContact(email?: string, phoneNumber?: string) {
  if (!email && !phoneNumber) throw new Error('At least one of email or phoneNumber must be provided.');

  const contacts = await prisma.contact.findMany({
    where: {
     OR: email && phoneNumber
  ? [{ email }, { phoneNumber }]
  : email
  ? [{ email }]
  : [{ phoneNumber }]

    orderBy: { createdAt: 'asc' }
  });

  if (contacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      }
    });
    return {
      primaryContatctId: newContact.id,
      emails: [newContact.email].filter(Boolean),
      phoneNumbers: [newContact.phoneNumber].filter(Boolean),
      secondaryContactIds: []
    };
  }

  let primary = contacts.find(c => c.linkPrecedence === 'primary') || contacts[0];
  for (const c of contacts) {
    if (c.createdAt < primary.createdAt) primary = c;
  }

  const secondaryIds: number[] = [];
  const emails = new Set<string>();
  const phones = new Set<string>();

  for (const c of contacts) {
    if (c.id !== primary.id) {
      if (c.linkPrecedence === 'primary') {
        await prisma.contact.update({
          where: { id: c.id },
          data: {
            linkPrecedence: 'secondary',
            linkedId: primary.id,
          }
        });
        secondaryIds.push(c.id);
      } else {
        secondaryIds.push(c.id);
      }
    }
    if (c.email) emails.add(c.email);
    if (c.phoneNumber) phones.add(c.phoneNumber);
  }

  if (
    !contacts.some(c => c.email === email && c.phoneNumber === phoneNumber)
  ) {
    const newSecondary = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primary.id,
      }
    });
    secondaryIds.push(newSecondary.id);
    if (newSecondary.email) emails.add(newSecondary.email);
    if (newSecondary.phoneNumber) phones.add(newSecondary.phoneNumber);
  }

  return {
    primaryContatctId: primary.id,
    emails: [primary.email, ...Array.from(emails).filter(e => e !== primary.email)].filter(Boolean),
    phoneNumbers: [primary.phoneNumber, ...Array.from(phones).filter(p => p !== primary.phoneNumber)].filter(Boolean),
    secondaryContactIds: secondaryIds
  };
}
