import sgMail from '@sendgrid/mail';
import { supabase } from '../../lib/supabase.js'; // Ensure supabase is imported

// Set your SendGrid API key
sgMail.setApiKey(import.meta.env.SENDGRID_API_KEY);

export async function post({ request }) {
  try {
    const { assignedRole, jobTitle, jobDescription } = await request.json();
    console.log("Received request:", { assignedRole, jobTitle, jobDescription });

    // Fetch users with the assigned role
    const { data, error } = await supabase
      .from("users")
      .select("email")
      .eq("role_id", assignedRole);

    if (error) {
      console.error("Error fetching users:", error);
      return {
        status: 500,
        body: { message: 'Error fetching users' }
      };
    }

    if (!data || data.length === 0) {
      console.warn("No users found for role:", assignedRole);
      return {
        status: 404,
        body: { message: "No users found for the assigned role" }
      };
    }

    const emails = data.map(user => user.email);
    console.log("Sending email to:", emails);

    const msg = {
      to: emails,
      from: 'daniel@dig.id', // Use your verified SendGrid email
      subject: `New Job Assigned: ${jobTitle}`,
      text: `A new job has been assigned to your role: ${jobTitle}. Description: ${jobDescription}`,
      html: `<strong>A new job has been assigned to your role: ${jobTitle}</strong><p>${jobDescription}</p>`,
    };

    // Send email and log response
    const response = await sgMail.send(msg);
    console.log("SendGrid response:", response);

    return {
      status: 200,
      body: { message: 'Emails sent successfully', response },
    };
  } catch (err) {
    console.error("Error sending email:", err);

    return {
      status: 500,
      body: { message: 'Error sending email', error: err.message },
    };
  }
}
