import { supabase } from '../lib/supabase.js';
export function initDashboard() {

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
            document.getElementById("user-info").textContent = `Logged in as: ${user.email}`;

            // Show user list and job creation only for superadmins (role_id = 1) and admins (role_id = 2)
            if (userData?.role_id === 1 || userData?.role_id === 2) {
                fetchUsers(); // Show the user list if superadmin or admin
                document.getElementById("user-list").classList.remove("hidden");
            } else {
                document.getElementById("user-list").classList.add("hidden"); // Hide user list for non-admin users
            }

            // Allow job creation only for superadmins (role_id = 1)
            if (userData?.role_id !== 1) {
                document.getElementById("job-form").classList.add("hidden");
            }
        }
    } catch (err) {
        console.error("Error fetching user role:", err);
    }
}

/*FETCH ROLES FUNCTION*/
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


/*CREATE JOBS FUNCTION*/
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

        // Insert the job, now assigning it to a role instead of a user
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

        // Send a notification to the assigned role (if necessary)
        await supabase
            .from("notifications")
            .insert([{
                role_id: assignedRole,  // You may need to adjust this if notifications are specific to users
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


async function fetchJobs() {
    try {
        const { data, error } = await supabase
            .from("jobs")
            .select("title, description, status");

        if (error) {
            console.error("Error fetching jobs:", error.message);
            return;
        }

        const jobListContainer = document.getElementById("job-list-container");

        if (data && Array.isArray(data)) {
            jobListContainer.innerHTML = data
                .map(job => `
                    <li class="bg-white p-4 rounded-lg shadow-md mb-4">
                        <h3 class="text-xl font-semibold">${job.title}</h3>
                        <p class="text-gray-700">${job.description}</p>
                        <p class="text-sm text-gray-500">Status: ${job.status}</p>
                    </li>
                `)
                .join("");
        }
    } catch (err) {
        console.error("Unexpected error fetching jobs:", err);
    }
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
}


    fetchUser();
    fetchJobs();
    loadRoles();
    document.getElementById("logout-btn").addEventListener("click", logout);
    document.getElementById("job-form").addEventListener("submit", createJob);


}