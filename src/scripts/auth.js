// @ts-nocheck
import { supabase } from '../lib/supabase.js';

export async function checkIfLoggedIn() {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    window.location.href = "/dashboard"; // Redirect logged-in users
  }
}

// Helper function to assign the default role 'user-level-1' on registration
async function assignDefaultRole(userId) {
  const { data, error } = await supabase
    .from('users')
    .update({ role_id: 3 })  // 3 corresponds to 'user-level-1' in the roles table
    .eq('id', userId);

  if (error) {
    console.error("Error assigning default role:", error.message);
  } else {
    console.log("Default role assigned successfully.");
  }
}

export async function registerUser(event) {
  event.preventDefault(); // Prevent default form submission

  // Get form fields safely
  const form = event.target;
  const email = form.email.value;
  const password = form.password.value;
  const displayName = form.display_name.value; // New field
  const phone = form.phone.value; // New field

  try {
    // Sign up the user in Supabase Auth and store metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          phone: phone
        }
      }
    });

    if (error) {
      console.error("Registration Error:", error.message);
      alert(error.message);
      return;
    }

    console.log("User registered:", data.user);

    // Insert user into "users" table (if signup was successful)
    if (data.user) {
      const { error: dbError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          email: data.user.email,
          username: displayName, // Assuming 'username' is the field in your 'users' table
          phone: phone
        }
      ]);

      if (dbError) {
        console.error("Error inserting into users table:", dbError.message);
      }

      // Assign default role 'user-level-1'
      await assignDefaultRole(data.user.id);
    }

    alert("Registration successful!");
    window.location.href = "/login"; // Redirect to login
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}


// Listen for auth state changes (runs when a user logs in or out)
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Auth state changed:", event, session);
  if (session) {
    window.location.href = "/dashboard"; // Redirect only when a session exists
  }
});

export async function loginUser(event) {
  event.preventDefault();

  const form = event.target;
  const identifier = form.identifier.value; // Could be email or username
  const password = form.password.value;

  try {
    let email = identifier;

    // If the input is NOT an email, assume it's a username and fetch the email
    if (!identifier.includes("@")) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email")
        .eq("username", identifier)
        .single(); // Expecting only one result

      if (userError || !userData) {
        console.error("User not found:", userError?.message);
        alert("Invalid username or email");
        return;
      }

      email = userData.email; // Use the fetched email
    }

    // Proceed with login using the email
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      console.error("Login Error:", authError.message);
      alert(authError.message);
      return;
    }

    console.log("User logged in:", authData.user);

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("id, email, full_name, role_id")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError.message);
    } else {
      console.log("User profile:", userProfile);

      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify(userProfile));

      // Set role-based access
      localStorage.setItem("canViewUserList", userProfile.role_id === 1 || userProfile.role_id === 2 ? "true" : "false");
    }

    alert("Login successful!");
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}


export async function fetchUsers() {
  try {
    const { data, error } = await supabase.from("users").select("id, email, full_name");

    if (error) {
      console.error("Error fetching users:", error.message);
      return;
    }

    console.log("Fetched users:", data);
    return data; // Return users for later use in UI
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

export async function resetPassword(event) {
  event.preventDefault();

  const form = event.target;
  const email = form.email.value;

  if (!email) {
    alert("Please enter your email.");
    return;
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error("Reset Error:", error.message);
      alert(error.message);
      return;
    }

    alert("A password reset link has been sent to your email.");
  } catch (err) {
    console.error("Unexpected error:", err);
    alert("Something went wrong. Please try again.");
  }
}
