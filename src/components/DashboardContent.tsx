// src/components/DashboardContent.tsx

import { useEffect } from "react";
import { supabase } from "../lib/supabase"; // Import your supabase instance

export default function DashboardContent() {
  useEffect(() => {
    fetchUser();
    // Initialize event listeners after the component mounts
    document.getElementById("logout-btn")?.addEventListener("click", logout);
    document.getElementById("job-form")?.addEventListener("submit", createJob);
  }, []);

  // Fetch current user info
  async function fetchUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error("Not logged in:", error?.message);
      window.location.href = "/login";
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, role_id")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching user profile:", userError.message);
      } else {
        document.getElementById("user-info")!.textContent = `Logged in as: ${user.email}`;

        // Allow user list & job creation only for superadmins (role_id = 1)
        if (userData?.role_id === 1) {
          fetchUsers();
        } else {
          document.getElementById("job-form")?.classList.add("hidden");
        }
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }
  }

  // Fetch users for superadmins to manage
  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role_id")
        .neq("role_id", 1); // Exclude superadmins

      if (error) {
        console.error("Error fetching users:", error.message);
        return;
      }

      const userListContainer = document.getElementById("user-list-container")!;
      const assignUserSelect = document.getElementById("assign-user")!;

      if (data && Array.isArray(data)) {
        userListContainer.innerHTML = data
          .map(
            (user) =>
              `<li class="text-lg text-gray-800">ID: ${user.id}, Email: ${user.email} (Role: ${user.role_id})</li>`
          )
          .join("");

        assignUserSelect.innerHTML = data
          .map((user) => `<option value="${user.id}">${user.email}</option>`)
          .join("");
      }
    } catch (err) {
      console.error("Unexpected error fetching users:", err);
    }
  }

  // Create job form logic
  async function createJob(event: React.FormEvent) {
    event.preventDefault();

    const title = (document.getElementById("job-title") as HTMLInputElement).value;
    const description = (document.getElementById("job-description") as HTMLTextAreaElement).value;
    const assignedUser = (document.getElementById("assign-user") as HTMLSelectElement).value;

    if (!title || !description || !assignedUser) {
      alert("Please fill in all fields.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("User not authenticated.");
      return;
    }

    try {
      // Ensure the creator is a superadmin
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id")
        .eq("id", user.id)
        .single();

      if (userError || userData.role_id !== 1) {
        alert("Only superadmins can create jobs.");
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .insert([
          {
            title: title,
            description: description,
            assigned_to: assignedUser,
            created_by: user.id,
            status: "open",
            created_at: new Date(),
          },
        ]);

      if (error) {
        console.error("Error creating job:", error.message);
        return;
      }

      document.getElementById("job-message")!.textContent = "Job successfully created!";
      document.getElementById("job-message")!.classList.remove("hidden");

      // Send a notification to the assigned user
      await supabase
        .from("notifications")
        .insert([
          {
            user_id: assignedUser,
            message: `You have been assigned a new job: ${title}`,
            created_at: new Date(),
            read: false,
          },
        ]);

      setTimeout(() => {
        document.getElementById("job-message")!.classList.add("hidden");
        document.getElementById("job-form")!.reset();
      }, 3000);
    } catch (err) {
      console.error("Error inserting job:", err);
    }
  }

  // Logout function
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-600 text-white p-6">
        <h2 className="text-xl font-semibold mb-8">Dashboard</h2>
        <ul className="space-y-4">
          <li><a href="#profile" className="text-lg hover:text-indigo-200">Profile</a></li>
          <li><a href="#user-list" className="text-lg hover:text-indigo-200" id="user-list-link">User List</a></li>
          <li><a href="#jobs" className="text-lg hover:text-indigo-200">Jobs</a></li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Profile Section */}
        <div id="profile" className="space-y-6">
          <h2 className="text-2xl font-bold mb-4">Profile</h2>
          <p id="user-info">Loading user info...</p>
          <button
            id="logout-btn"
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        {/* User List */}
        <div id="user-list" className="space-y-6 mt-10">
          <h2 className="text-2xl font-bold mb-4">User List</h2>
          <ul id="user-list-container"></ul>
        </div>

        {/* Create Job Form */}
        <div className="bg-white p-6 rounded-lg shadow-md mt-10">
          <h2 className="text-xl font-semibold mb-4">Create a Job</h2>
          <form id="job-form">
            <label className="block mb-2">Title:</label>
            <input
              type="text"
              id="job-title"
              className="w-full p-2 border rounded mb-4"
              required
            />

            <label className="block mb-2">Description:</label>
            <textarea
              id="job-description"
              className="w-full p-2 border rounded mb-4"
              required
            />

            <label className="block mb-2">Assign To:</label>
            <select
              id="assign-user"
              className="w-full p-2 border rounded mb-4"
            >
              {/* Options will be dynamically loaded */}
            </select>

            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create Job
            </button>
          </form>
          <p id="job-message" className="text-green-600 mt-4 hidden"></p>
        </div>
      </div>
    </div>
  );
}
