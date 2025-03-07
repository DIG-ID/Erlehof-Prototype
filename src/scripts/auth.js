// @ts-nocheck
import { supabase } from '../lib/supabase.js';

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

  try {
    // Sign up the user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error("Registration Error:", error.message);
      alert(error.message);
      return;
    }

    console.log("User registered:", data.user);

    // Insert user into "users" table (if signup was successful)
    if (data.user) {
      const { error: dbError } = await supabase.from("users").insert([
        { id: data.user.id, email: data.user.email }
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

export async function loginUser(event) {
  event.preventDefault();

  const form = event.target;
  const email = form.email.value;
  const password = form.password.value;

  try {
    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      console.error("Login Error:", authError.message);
      alert(authError.message);
      return;
    }

    console.log("User logged in:", authData.user);

    // Fetch user info from "users" table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, role_id")
      .eq("id", authData.user.id)
      .single(); // Expecting only one user

    if (userError) {
      console.error("Error fetching user profile:", userError.message);
    } else {
      console.log("User profile:", userData);

      // (Optional) Store user info and role in localStorage
      localStorage.setItem("user", JSON.stringify(userData));

      // If role is 'admin' or 'superadmin', show user list
      if (userData.role_id === 1 || userData.role_id === 2) {
        localStorage.setItem("canViewUserList", "true");
      } else {
        localStorage.setItem("canViewUserList", "false");
      }
    }

    alert("Login successful!");
    window.location.href = "/dashboard"; // Redirect to dashboard
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
