// src/utils/userUtils.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/*
 * Converts an array of email addresses to user UUIDs
 * @param {Array<string>} emails - Array of email addresses
 * @returns {Promise<{foundUsers: Array<{id: string, email: string}>, notFoundEmails: Array<string>}>}
 */
export async function getUUIDsFromEmails(emails) {
  try {
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return { foundUsers: [], notFoundEmails: [] };
    }

    // Find users by email
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: emails
        }
      },
      select: {
        id: true,
        email: true
      }
    });

    // Get list of emails that weren't found
    const foundEmails = users.map(user => user.email);
    console.log("The emails that are found are: ",foundEmails);
    const notFoundEmails = emails.filter(email => !foundEmails.includes(email));

    return {
      foundUsers: users,
      notFoundEmails
    };
  } catch (error) {
    console.error('Error converting emails to UUIDs:', error);
    throw error;
  }
}