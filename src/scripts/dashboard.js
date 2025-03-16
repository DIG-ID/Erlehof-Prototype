import { supabase } from '../lib/supabase.js';

export function initDashboard() {
    // Function to fetch users
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

            const userListContainer = document.getElementById("user-list-container");

            if (data && Array.isArray(data)) {
                // Display user information elsewhere on the page if needed
                userListContainer.innerHTML = data
                    .map(user => `<li class="text-lg text-gray-800">ID: ${user.id}, Email: ${user.email} (Role: ${user.role_id})</li>`)
                    .join("");
            }
        } catch (err) {
            console.error("Unexpected error fetching users:", err);
        }
    }

    // Function to fetch logged-in user and handle role-based UI logic
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
                .select("id, username, email, role_id") // Fetch username
                .eq("id", user.id)
                .single();
    
            if (userError) {
                console.error("Error fetching user profile:", userError.message);
            } else {
                document.querySelectorAll('.user-info').forEach(userInfoElement => {
                    userInfoElement.textContent = `Logged in as: ${userData.username || user.email}`;
                });
    
                // Show or hide menu items based on role
                const userListLink = document.querySelector('a[data-target="user-list"]');
                const createJobLink = document.querySelector('a[data-target="create-job"]');
                const jobSettingsLink = document.querySelector('a[data-target="job-settings"]');
    
                // Show user list and job creation only for superadmins (role_id = 1) and admins (role_id = 2)
                if (userData?.role_id === 1 || userData?.role_id === 2) {
                    userListLink.closest("li").classList.remove("hidden"); // Show User List
                    createJobLink.closest("li").classList.remove("hidden"); // Show Create Job
                    jobSettingsLink.closest("li").classList.remove("hidden");
                    fetchUsers(); // Show the user list if superadmin or admin
                    document.getElementById("user-list").classList.remove("hidden");
                } else {
                    userListLink.closest("li").classList.add("hidden"); // Hide User List
                    createJobLink.closest("li").classList.add("hidden"); // Hide Create Job
                    jobSettingsLink.closest("li").classList.add("hidden");
                    document.getElementById("user-list").classList.add("hidden"); // Hide user list for non-admin users
                }
    
                // Allow job creation only for superadmins (role_id = 1)
                if (userData?.role_id !== 1) {
                    document.getElementById("job-form").classList.add("hidden");
                }
    
                // Fetch and display jobs for the logged-in user
                fetchJobs(userData.role_id);
            }
        } catch (err) {
            console.error("Error fetching user role:", err);
        }
    }
    

    // Fetch roles
    async function loadRoles() {
        try {
            const { data: roles, error } = await supabase
                .from('roles')
                .select('id, role_name');

            if (error) {
                console.error("Error loading roles:", error.message);
                return;
            }

            const selectElement = document.getElementById("assign-user");

            // Clear existing options
            selectElement.innerHTML = '';

            // Add default "Select a role" option (optional)
            const defaultOption = document.createElement("option");
            defaultOption.value = '';
            defaultOption.textContent = 'Select a role';
            selectElement.appendChild(defaultOption);

            roles.forEach(role => {
                const option = document.createElement("option");
                option.value = role.id;
                option.textContent = role.role_name;
                selectElement.appendChild(option);
            });
        } catch (err) {
            console.error("Error fetching roles:", err);
        }
    }

    // Job creation function
    async function createJob(event) {
        event.preventDefault();

        const title = document.getElementById("job-title").value;
        const description = document.getElementById("job-description").value;
        const assignedRole = document.getElementById("assign-user").value;

        if (!title || !description || !assignedRole) {
            alert("Please fill in all fields.");
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("User not authenticated.");
            return;
        }

        try {
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("role_id")
                .eq("id", user.id)
                .single();

            if (userError || userData.role_id !== 1) {
                alert("Only superadmins can create jobs.");
                return;
            }

            // Insert the job
            const { data, error } = await supabase
                .from("jobs")
                .insert([{
                    title: title,
                    description: description,
                    assigned_to: assignedRole,  // This is now the role ID
                    created_by: user.id,
                    status: "open",
                    created_at: new Date()
                }]);

            if (error) {
                console.error("Error creating job:", error.message);
                return;
            }

            document.getElementById("job-message").textContent = "Job successfully created!";
            document.getElementById("job-message").classList.remove("hidden");

            // Send a notification to the assigned role
            await supabase
                .from("notifications")
                .insert([{
                    role_id: assignedRole,
                    message: `A new job has been assigned to the ${assignedRole} role: ${title}`,
                    created_at: new Date(),
                    read: false
                }]);

            setTimeout(() => {
                document.getElementById("job-message").classList.add("hidden");
                document.getElementById("job-form").reset();
            }, 3000);

        } catch (err) {
            console.error("Error inserting job:", err);
        }
    }

    async function removeJob(jobId) {
        try {
            console.log("Removing job with ID:", jobId); // Debugging line
            const { error } = await supabase
                .from("jobs")
                .delete()
                .eq("id", jobId);
    
            if (error) {
                console.error("Error deleting job:", error.message);
                return;
            }
    
            // Refresh the job list after removing the job
            fetchJobs();
        } catch (err) {
            console.error("Error removing job:", err);
        }
    }
    

    async function acceptJob(jobId) {
        try {
            // Fetch the logged-in user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
    
            if (authError || !user) {
                console.error("User not authenticated:", authError?.message);
                return;
            }
    
            // Update the job with status "assigned" and set accepted_by to the user's ID
            const { error } = await supabase
                .from("jobs")
                .update({
                    status: "assigned",
                    accepted_by: user.id, // Assign the job to the current user
                })
                .eq("id", jobId);
    
            if (error) {
                console.error("Error updating job status:", error.message);
                return;
            }
    
            // Refresh the job list after updating the job status
            fetchJobs();
        } catch (err) {
            console.error("Error accepting job:", err);
        }
    }
    

    // Fetch jobs and display notification if any open jobs are assigned to the user's role
    async function fetchJobs(roleId) {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                console.error("Not logged in:", authError?.message);
                window.location.href = "/login";
                return;
            }
    
            // Get the user's role
            const { data: userData, error: userError } = await supabase
                .from("users")
                .select("role_id")
                .eq("id", user.id)
                .single();
    
            if (userError) {
                console.error("Error fetching user role:", userError.message);
                return;
            }
    
            let jobsQuery = supabase.from("jobs").select("id, title, description, status, assigned_to");
    
            // If the user is not a superadmin or admin, filter jobs by their role
            if (userData.role_id !== 1 && userData.role_id !== 2) {
                jobsQuery = jobsQuery.eq("assigned_to", userData.role_id);
            }
    
            const { data, error } = await jobsQuery;
    
            if (error) {
                console.error("Error fetching jobs:", error.message);
                return;
            }
    
            const jobListContainer = document.getElementById("job-list-container");
    
            // Define which roles are allowed to accept jobs
            const allowedRoles = [3, 4]; // Example roles that can accept jobs
    
            // Display jobs in the list
            if (data && Array.isArray(data)) {
                jobListContainer.innerHTML = data
                    .map(job => {
                        return `
                            <li class="flex items-center justify-between space-x-4 border-b py-3">
                                <div>
                                    <p class="font-bold">${job.title}</p>
                                    <p class="text-gray-600">${job.description}</p>
                                </div>
                                <div class="flex space-x-2">
                                    ${job.status === "open"
                                        ? (allowedRoles.includes(userData.role_id)
                                            ? `<button 
                                                    class="acceptButton bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 hover:cursor-pointer"
                                                    data-job-id="${job.id}"
                                                >
                                                    Accept
                                                </button>` 
                                            : `<span class="bg-gray-500 text-white px-4 text-sm font-medium py-2 rounded-lg hover:cursor-default">Open</span>`)
                                        : `<span class="bg-[#006f9a] text-white px-4 py-2 text-sm font-medium rounded-lg hover:cursor-default">Assigned</span>`
                                    }
                                    <button 
                                        class="removeButton hidden bg-red-700 text-white px-4 py-2 text-sm rounded-lg font-medium hover:cursor-pointer"
                                        data-job-id="${job.id}"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        `;
                    })
                    .join("");
            }
    
            // Add event listeners for the accept buttons dynamically
            const acceptButtons = jobListContainer.querySelectorAll('button.acceptButton');
            acceptButtons.forEach(button => {
                button.addEventListener("click", function() {
                    const jobId = button.getAttribute('data-job-id');
                    acceptJob(jobId); // Pass the job ID to the acceptJob function
                });
            });
    
            const removeButtons = jobListContainer.querySelectorAll('button.removeButton'); 
            removeButtons.forEach(button => {
                button.addEventListener("click", function() {
                    const jobId = button.getAttribute('data-job-id');
                    removeJob(jobId); // Call the removeJob function
                });
            });
    
            // Job notification message, only for non-superadmin/admin users
            const jobNotification = document.getElementById("job-notification");
            if (userData.role_id !== 1 && userData.role_id !== 2) {
                // Filter the jobs to include only those with status "open"
                const openJobs = data.filter(job => job.status === "open");
    
                if (openJobs.length > 0) {
                    jobNotification.innerHTML = `✅ You have ${openJobs.length} open job(s) assigned to your role.`;
                    jobNotification.classList.remove("hidden");
                    jobNotification.classList.add("bg-green-100", "text-green-700", "p-3", "rounded");
                } else {
                    jobNotification.innerHTML = "❌ No open jobs assigned to your role.";
                    jobNotification.classList.remove("hidden");
                    jobNotification.classList.add("bg-red-100", "text-red-700", "p-3", "rounded");
                }
            } else {
                jobNotification.classList.add("hidden");
            }
    
        } catch (err) {
            console.error("Error fetching jobs:", err);
        }
    }
    
    async function fetchJobSettings() {
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select(`
                    id, 
                    title, 
                    description, 
                    status, 
                    created_at, 
                    roles:assigned_to(role_name),
                    accepted_by(id, username, email)
                `)
                .order('created_at', { ascending: true }); // Order by created_at (oldest first)
    
            if (error) {
                console.error('Error fetching job data:', error);
                return;
            }
    
            const tableBody = document.querySelector('#job-settings-table tbody');
            tableBody.innerHTML = ''; // Clear existing rows
    
            data.forEach(job => {
                const acceptedUser = job.accepted_by 
                    ? `${job.accepted_by.username} (${job.accepted_by.email})`
                    : 'Unassigned';
    
                const row = document.createElement('tr');
    
                row.innerHTML = `
                    <td class="border p-2">${job.title}</td>
                    <td class="border p-2">${job.description}</td>
                    <td class="border p-2">${job.status}</td>
                    <td class="border p-2">${job.roles ? job.roles.role_name : 'Unassigned'}</td>
                    <td class="border p-2">${acceptedUser}</td>
                    <td class="border p-2">${new Date(job.created_at).toLocaleString()}</td>
                    <td class="border p-2">
                        <button class="edit-btn bg-[#006f9a] text-white px-2 py-1 rounded" data-id="${job.id}">Edit</button>
                        <button class="delete-btn bg-red-700 text-white px-2 py-1 rounded ml-2" data-id="${job.id}">Delete</button>
                    </td>
                `;
    
                tableBody.appendChild(row);
            });
    
            // Attach event listeners for edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const jobId = event.target.dataset.id;
                    editJob(jobId);
                });
            });
    
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const jobId = event.target.dataset.id;
                    await deleteJob(jobId);
                });
            });
    
        } catch (error) {
            console.error('Error fetching job data:', error);
        }
    }
    
    
      
      
    // Function to handle edit action
    function editJob(jobId) {
    alert(`Edit job with ID: ${jobId}`); 
    // Implement modal or form for editing
    }
      
    // Function to handle delete action
    async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);
    
    if (error) {
        console.error('Error deleting job:', error);
        return;
    }
    
    // Refresh the table
    fetchJobSettings();
    }
    
    // Call the fetch function when the page loads
    document.addEventListener('DOMContentLoaded', () => {
    fetchJobSettings();
    });
      

    // Logout function
    async function logout() {
        await supabase.auth.signOut();
        window.location.href = "/login";
    }

    // Initialize the dashboard
    fetchUser();
    loadRoles();
    fetchJobSettings();

    // Set up event listeners
    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("job-form").addEventListener("submit", createJob);
}
