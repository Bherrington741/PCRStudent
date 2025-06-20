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

    document.getElementById('applyFilters').addEventListener('click', fetchAllReports);

    async function fetchAllReports() {
        const searchComplaint = document.getElementById('searchComplaint').value.trim();
        const searchProvider = document.getElementById('searchProvider').value.trim();
        const sortOrder = document.getElementById('sortOrder').value;

        try {
            let query = window.supabaseClient
                .from('reports')
                .select('id, created_at, incidentDate:report_data->incidentDetails->>incidentDate, chiefComplaint:report_data->patientInfo->>chiefComplaint, providerName:report_data->>providerName');

            if (searchComplaint) {
                query = query.ilike('report_data->patientInfo->>chiefComplaint', `%${searchComplaint}%`);
            }

            if (searchProvider) {
                query = query.ilike('report_data->>providerName', `%${searchProvider}%`);
            }

            const ascending = sortOrder === 'asc';
            query = query.order('created_at', { ascending: ascending });

            const { data: reports, error } = await query;

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
                const providerName = report.providerName || 'N/A';
                listItem.innerHTML = `
                    Report ID: ${report.id} - Date: ${reportDate} - Provider: ${providerName} - Complaint: ${chiefComplaint}
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

    // Modal close functionality
    const modal = document.getElementById('reportModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

        } catch (error) {
            console.error('Error fetching all reports:', error);
            adminReportList.innerHTML = '<li>Error loading reports.</li>';
        }
    }

    async function downloadReportAsPDFAdmin(reportId, report, reportData) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            let yPos = 10;
            const lineHeight = 7;
            const margin = 10;

            doc.setFontSize(16);
            doc.text('Patient Care Report', margin, yPos);
            yPos += lineHeight * 2;

            doc.setFontSize(12);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos); yPos += lineHeight;
            doc.text(`Report Created: ${new Date(report.created_at).toLocaleString()}`, margin, yPos); yPos += lineHeight * 2;

            doc.setFontSize(14);
            doc.text('Incident Details', margin, yPos); yPos += lineHeight;
            doc.setFontSize(10);
            doc.text(`Date: ${reportData.incidentDetails?.incidentDate || 'N/A'}`, margin + 5, yPos); yPos += lineHeight;
            doc.text(`Time: ${reportData.incidentDetails?.incidentTime || 'N/A'}`, margin + 5, yPos); yPos += lineHeight * 2;

            doc.setFontSize(14);
            doc.text('Patient Information', margin, yPos); yPos += lineHeight;
            doc.setFontSize(10);
            doc.text(`Age: ${reportData.patientInfo?.patientAge || 'N/A'}`, margin + 5, yPos); yPos += lineHeight;
            doc.text(`Gender: ${reportData.patientInfo?.patientGender || 'N/A'}`, margin + 5, yPos); yPos += lineHeight;
            doc.text(`Provider: ${reportData.providerName || 'N/A'}`, margin + 5, yPos); yPos += lineHeight;
            doc.text(`Chief Complaint: ${reportData.patientInfo?.chiefComplaint || 'N/A'}`, margin + 5, yPos); yPos += lineHeight * 2;

            doc.setFontSize(14);
            doc.text('Vital Signs', margin, yPos); yPos += lineHeight;
            doc.setFontSize(10);
            if (reportData.vitalSets && reportData.vitalSets.length > 0) {
                reportData.vitalSets.forEach((vs, index) => {
                    doc.text(`Set ${index + 1}:`, margin + 5, yPos); yPos += lineHeight;
                    doc.text(`  Time: ${vs.vitalTime || 'N/A'}`, margin + 10, yPos); yPos += lineHeight;
                    doc.text(`  BP: ${vs.bp || 'N/A'}`, margin + 10, yPos); yPos += lineHeight;
                    doc.text(`  HR: ${vs.hr || 'N/A'}`, margin + 10, yPos); yPos += lineHeight;
                    doc.text(`  RR: ${vs.rr || 'N/A'}`, margin + 10, yPos); yPos += lineHeight;
                    doc.text(`  SpO2: ${vs.spo2 || 'N/A'}`, margin + 10, yPos); yPos += lineHeight;
                    doc.text(`  GCS: ${vs.gcs || 'N/A'}`, margin + 10, yPos); yPos += lineHeight;
                });
            } else {
                doc.text('No vital signs recorded.', margin + 5, yPos); yPos += lineHeight;
            }
            yPos += lineHeight;

            doc.setFontSize(14);
            doc.text('Assessment', margin, yPos); yPos += lineHeight;
            doc.setFontSize(10);
            const assessmentItems = ['head', 'neck', 'chest', 'abdomen', 'pelvis', 'extremities', 'back', 'neuro'];
            assessmentItems.forEach(item => {
                const assessmentArea = reportData.assessment?.[item];
                const wnl = assessmentArea?.wnl;
                const details = assessmentArea?.details;
                let itemText = `${item.charAt(0).toUpperCase() + item.slice(1).replace('_', ' ')}: `;
                if (wnl) {
                    itemText += 'WNL';
                } else {
                    itemText += details || 'Not assessed';
                }
                doc.text(itemText, margin + 5, yPos); yPos += lineHeight;
            });
            yPos += lineHeight;

            doc.setFontSize(14);
            doc.text('Narrative', margin, yPos); yPos += lineHeight;
            doc.setFontSize(10);
            const narrative = reportData.narrative || 'No narrative provided.';
            const splitNarrative = doc.splitTextToSize(narrative, 180);
            doc.text(splitNarrative, margin + 5, yPos);

            const fileName = `PCR_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF: ' + error.message);
        }
    }

    async function viewReportAdmin(reportId) {
        try {
            const { data: report, error } = await window.supabaseClient
                .from('reports')
                .select('*')
                .eq('id', reportId)
                .single();
            
            if (error) throw error;
            
            const reportData = report.report_data;
            const modal = document.getElementById('reportModal');
            const reportDetails = document.getElementById('reportDetails');
            
            // Format the report data for display
            const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : 'N/A';
            const formatTime = (timeStr) => timeStr || 'N/A';
            
            reportDetails.innerHTML = `
                <div class="report-detail-section">
                    <h3>Report Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${new Date(report.created_at).toLocaleString()}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Provider:</span>
                        <span class="detail-value">${reportData.providerName || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="report-detail-section">
                    <h3>Incident Details</h3>
                    <div class="detail-row">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${formatDate(reportData.incidentDetails?.incidentDate)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Time:</span>
                        <span class="detail-value">${formatTime(reportData.incidentDetails?.incidentTime)}</span>
                    </div>
                </div>
                
                <div class="report-detail-section">
                    <h3>Patient Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Age:</span>
                        <span class="detail-value">${reportData.patientInfo?.patientAge || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Gender:</span>
                        <span class="detail-value">${reportData.patientInfo?.patientGender || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Chief Complaint:</span>
                        <span class="detail-value">${reportData.patientInfo?.chiefComplaint || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="report-detail-section">
                    <h3>Vital Signs</h3>
                    ${reportData.vitalSets && reportData.vitalSets.length > 0 ? 
                        reportData.vitalSets.map((vs, index) => `
                            <h4>Set ${index + 1}</h4>
                            <div class="detail-row">
                                <span class="detail-label">Time:</span>
                                <span class="detail-value">${vs.vitalTime || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Blood Pressure:</span>
                                <span class="detail-value">${vs.bp || 'N/A'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Heart Rate:</span>
                                <span class="detail-value">${vs.hr || 'N/A'} BPM</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Respiratory Rate:</span>
                                <span class="detail-value">${vs.rr || 'N/A'} RPM</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">SpO2:</span>
                                <span class="detail-value">${vs.spo2 || 'N/A'}%</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">GCS:</span>
                                <span class="detail-value">${vs.gcs || 'N/A'}</span>
                            </div>
                        `).join('') : 
                        '<p>No vital signs recorded.</p>'
                    }
                </div>
                
                <div class="report-detail-section">
                    <h3>Assessment</h3>
                    ${reportData.assessment ? Object.keys(reportData.assessment).map(area => {
                        const assessment = reportData.assessment[area];
                        return `
                            <div class="detail-row">
                                <span class="detail-label">${area.replace('_', ' ').toUpperCase()}:</span>
                                <span class="detail-value">${assessment.wnl ? 'WNL' : (assessment.details || 'No details')}</span>
                            </div>
                        `;
                    }).join('') : '<p>No assessment data.</p>'}
                </div>
                
                <div class="report-detail-section">
                    <h3>Narrative</h3>
                    <div class="detail-value">${reportData.narrative || 'No narrative provided.'}</div>
                </div>
                
                <div class="report-detail-section" style="text-align: center; margin-top: 20px;">
                    <button id="downloadPdfBtn" class="btn" data-report-id="${reportId}" style="background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Download PDF</button>
                </div>
            `;
            
            modal.style.display = 'block';
            
            // Add event listener for PDF download button
            const downloadBtn = document.getElementById('downloadPdfBtn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', function() {
                    downloadReportAsPDFAdmin(reportId, report, reportData);
                });
            }
            
        } catch (error) {
            console.error('Error fetching report for admin view:', error);
            alert('Could not load report details: ' + error.message);
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