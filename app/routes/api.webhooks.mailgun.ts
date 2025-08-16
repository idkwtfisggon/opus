import type { ActionFunction } from "react-router";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { processEmail } from "../utils/email-processing";
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

// Initialize Mailgun client for forwarding
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: '7d29e6854ae52d2440989bc849a37ed4-16bc1610-51644a0f',
  url: 'https://api.mailgun.net', // US region
});

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse multipart form data from Mailgun
    const formData = await request.formData();
    
    // Extract email data
    const from = formData.get("sender") as string;
    const to = formData.get("recipient") as string;
    const subject = formData.get("subject") as string;
    const bodyHtml = formData.get("body-html") as string;
    const bodyPlain = formData.get("body-plain") as string;
    const attachmentCount = parseInt(formData.get("attachment-count") as string || "0");

    // Use HTML body if available, otherwise plain text
    const body = bodyHtml || bodyPlain || "";

    console.log(`Processing email from ${from} to ${to}: ${subject}`);

    // Validate that this is for a customer email
    if (!to.includes("@sandbox66b2007e061f4536af04dca475932b61.mailgun.org")) {
      console.log("Email not for our domain, ignoring");
      return new Response("OK", { status: 200 });
    }

    // Process attachments
    const attachments: Array<{
      filename: string;
      contentType: string;
      content: Buffer;
    }> = [];

    for (let i = 1; i <= attachmentCount; i++) {
      const attachmentFile = formData.get(`attachment-${i}`) as File;
      if (attachmentFile) {
        const content = Buffer.from(await attachmentFile.arrayBuffer());
        attachments.push({
          filename: attachmentFile.name,
          contentType: attachmentFile.type,
          content,
        });
      }
    }

    // Process email content and attachments
    const processingResult = await processEmail({
      from,
      to,
      subject,
      body,
      attachments,
    });

    console.log(`Email processing result:`, {
      isShippingEmail: processingResult.isShippingEmail,
      confidence: processingResult.confidence,
      trackingNumbers: processingResult.extractedData.trackingNumbers,
      shopName: processingResult.extractedData.shopName,
    });

    // Only process shipping emails (ignore spam)
    if (!processingResult.isShippingEmail) {
      console.log("Email detected as spam, ignoring");
      return new Response("OK", { status: 200 });
    }

    // Upload attachments to Convex storage
    const uploadedAttachments: Array<{
      filename: string;
      contentType: string;
      storageId: string;
      size: number;
    }> = [];

    for (const attachment of attachments) {
      try {
        // Generate upload URL
        const uploadUrl = await fetchMutation(api.files.generateUploadUrl, {});
        
        // Upload file
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": attachment.contentType },
          body: attachment.content,
        });

        if (uploadResult.ok) {
          const { storageId } = await uploadResult.json();
          uploadedAttachments.push({
            filename: attachment.filename,
            contentType: attachment.contentType,
            storageId,
            size: attachment.content.length,
          });
        }
      } catch (error) {
        console.error("Error uploading attachment:", error);
      }
    }

    // Store email in database
    const emailId = await fetchMutation(api.emails.processIncomingEmail, {
      from,
      to,
      subject,
      body,
      attachments: uploadedAttachments,
      extractedData: processingResult.extractedData,
      isShippingEmail: processingResult.isShippingEmail,
      confidence: processingResult.confidence,
      spamScore: processingResult.spamScore,
      spamReasons: processingResult.spamReasons,
      mailgunEventId: formData.get("Message-Id") as string,
    });

    console.log(`Email stored with ID: ${emailId}`);

    // Forward email to customer's real email
    try {
      const forwardResult = await fetchMutation(api.emails.forwardEmailToCustomer, {
        emailId,
      });

      if (forwardResult.success) {
        // Forward via Mailgun
        await mg.messages.create('sandbox66b2007e061f4536af04dca475932b61.mailgun.org', {
          from: from,
          to: forwardResult.forwardToEmail,
          subject: `[Forwarded] ${subject}`,
          html: `
            <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 20px; background: #f9f9f9;">
              <strong>Forwarded shipping confirmation</strong><br>
              <small>Original recipient: ${to}</small>
            </div>
            ${body}
          `,
          // Note: Attachments would need to be re-downloaded and forwarded
          // This is simplified for now
        });

        console.log(`Email forwarded to: ${forwardResult.forwardToEmail}`);
      }
    } catch (error) {
      console.error("Error forwarding email:", error);
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
};

// Mailgun requires GET endpoint for webhook verification
export async function loader() {
  return new Response("Mailgun webhook endpoint", { status: 200 });
}