import type { Job } from '@shared/types';
interface NotificationDetails {
  email: string;
  searchName: string;
  jobs: Job[];
}
function generateHtmlBody(details: NotificationDetails): string {
  const jobListHtml = details.jobs
    .map(
      (job) => `
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px 0; font-size: 18px;">
        <a href="${job.url}" style="color: #2563eb; text-decoration: none;">${job.title}</a>
      </h3>
      <p style="margin: 0 0 4px 0; color: #475569;"><strong>Company:</strong> ${job.company}</p>
      <p style="margin: 0 0 12px 0; color: #475569;"><strong>Location:</strong> ${job.location}</p>
      <a href="${job.url}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">
        View & Apply
      </a>
    </div>
  `
    )
    .join('');
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h1 style="font-size: 24px; color: #0f172a;">New Job Opportunities!</h1>
      <p style="color: #475569;">Hi there,</p>
      <p style="color: #475569;">We found ${details.jobs.length} new job(s) matching your saved search: "<strong>${details.searchName}</strong>".</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      ${jobListHtml}
      <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 20px;">
        You are receiving this because you subscribed to JobBeacon.
      </p>
    </div>
  `;
}
export async function sendNotificationEmail(details: NotificationDetails) {
  const emailPayload = {
    to: details.email,
    from: 'noreply@jobbeacon.com',
    subject: `🚀 ${details.jobs.length} New Job(s) for your "${details.searchName}" search!`,
    html: generateHtmlBody(details),
  };
  console.log('--- [SIMULATING EMAIL] ---');
  console.log(`To: ${emailPayload.to}`);
  console.log(`From: ${emailPayload.from}`);
  console.log(`Subject: ${emailPayload.subject}`);
  console.log('--- HTML Body ---');
  console.log(emailPayload.html);
  console.log('--- End of Email ---');
  return Promise.resolve();
}