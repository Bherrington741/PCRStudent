// Ensure SUPABASE_URL and SUPABASE_ANON_KEY are defined in auth.js or globally
// const { createClient } = supabase;
// const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const adminReportList = document.getElementById('adminReportList');
    const logoutButtonAdmin = document.getElementById('logoutButtonAdmin');
    const adminReportListContainer = document.getElementById('adminReportListContainer');
    const adminAccessDenied = document.getElementById('adminAccessDenied');

    // Check user session and role
    async function checkUserRoleAndFetchReports() {
        if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient.auth) {
            console.error('Supabase client not initialized.');
            adminReportListContainer.style.display = 'none';
            adminAccessDenied.style.display = 'block';
            adminAccessDenied.innerHTML = '<p>Error: Supabase client not available. Cannot verify user role.</p>';
            return;
        }

        const { data: { session }, error: sessionError } = await window.supabaseClient.auth.getSession();

        if (sessionError) {
            console.error('Error getting session:', sessionError);
            adminReportListContainer.style.display = 'none';
            adminAccessDenied.style.display = 'block';
            adminAccessDenied.innerHTML = '<p>Error checking your session. Please try logging in again.</p>';
            // Potentially redirect to login if appropriate
            // window.location.href = 'index.html'; 
            return;
        }

        if (!session) {
            console.log('No active session. Redirecting to login.');
            window.location.href = 'index.html'; // Redirect to login if not authenticated
            return;
        }

        // Fetch user's role from their metadata
        // Supabase stores custom data in user.user_metadata by default when signing up
        // or can be updated via admin functions or backend logic.
        const user = session.user;
        const userRole = user.user_metadata?.role;

        if (userRole === 'admin') {
            adminReportListContainer.style.display = 'block';
            adminAccessDenied.style.display = 'none';
            fetchAllReports();
        } else {
            console.log('User is not an admin. Access denied.');
            adminReportListContainer.style.display = 'none';
            adminAccessDenied.style.display = 'block';
        }
    }

    async function fetchAllReports() {
        try {
            // Ensure RLS policy allows admins to read all reports
            const { data: reports, error } = await window.supabaseClient
                .from('reports')
                .select('id, created_at, incidentDate:report_data->incidentDetails->>incidentDate, chiefComplaint:report_data->patientInfo->>chiefComplaint')
                .order('created_at', { ascending: false });

            if (error) throw error;

            adminReportList.innerHTML = ''; // Clear existing list
            if (reports.length === 0) {
                adminReportList.innerHTML = '<li>No reports found.</li>';
                return;
            }

            reports.forEach(report => {
                const listItem = document.createElement('li');
                const reportDate = report.incidentDate ? new Date(report.incidentDate).toLocaleDateString() : 'N/A';
                const chiefComplaint = report.chiefComplaint || 'N/A';
                listItem.innerHTML = `
                    Report ID: ${report.id} - Date: ${reportDate} - Complaint: ${chiefComplaint}
                    <button class="view-report-btn-admin" data-id="${report.id}">View Full Report</button>
                    <button class="delete-report-btn-admin" data-id="${report.id}">Delete Report</button>
                `;
                adminReportList.appendChild(listItem);
            });

            // Add event listeners for view and delete buttons (implementation needed)
            document.querySelectorAll('.view-report-btn-admin').forEach(button => {
                button.addEventListener('click', (e) => viewReportAdmin(e.target.dataset.id));
            });
            document.querySelectorAll('.delete-report-btn-admin').forEach(button => {
                button.addEventListener('click', (e) => deleteReportAdmin(e.target.dataset.id));
            });

        } catch (error) {
            console.error('Error fetching all reports:', error);
            adminReportList.innerHTML = '<li>Error loading reports.</li>';
        }
    }

    async function viewReportAdmin(reportId) {
        // This function would be similar to viewReport in script.js
        // but adapted for the admin page. It might open a modal or a new view.
        console.log(`Admin viewing report: ${reportId}`);
        alert(`Placeholder: Admin view for report ${reportId}. Implementation needed.`);
        // For now, let's fetch and log the full report data
        try {
            const { data: report, error } = await window.supabaseClient
                .from('reports')
                .select('*')
                .eq('id', reportId)
                .single();
            if (error) throw error;
            console.log('Full report data for admin:', report);
            // You would typically display this in a modal or a dedicated view section
        } catch (error) {
            console.error('Error fetching report for admin view:', error);
            alert('Could not load report details.');
        }
    }

    async function deleteReportAdmin(reportId) {
        if (!confirm(`Are you sure you want to delete report ${reportId}? This action cannot be undone.`)) {
            return;
        }
        try {
            const { error } = await window.supabaseClient
                .from('reports')
                .delete()
                .eq('id', reportId);

            if (error) throw error;
            alert('Report deleted successfully.');
            fetchAllReports(); // Refresh the list
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report: ' + error.message);
        }
    }

    if (logoutButtonAdmin) {
        logoutButtonAdmin.addEventListener('click', async () => {
            if (typeof logout === 'function') {
                await logout(); // Call logout function from auth.js
            } else {
                console.error('Logout function not found.');
                alert('Error: Logout function is not available.');
            }
        });
    }

    // Initial call to check role and fetch reports
    checkUserRoleAndFetchReports();
});