// IMPORTANT: Ensure SUPABASE_URL and SUPABASE_ANON_KEY are defined, typically in auth.js or here if auth.js is not loaded first.
// const SUPABASE_URL = 'YOUR_SUPABASE_URL';
// const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Supabase client is expected to be initialized in auth.js and available globally via 'window.supabaseClient'.

document.addEventListener('DOMContentLoaded', () => {
    const pcrForm = document.getElementById('pcrForm');
    const clearFormButton = document.getElementById('clearForm');
    const addVitalSetButton = document.getElementById('addVitalSet');
    const vitalsContainer = document.getElementById('vitalsContainer');
    const logoutButton = document.getElementById('logoutButton');
    const reportList = document.getElementById('reportList');
    const refreshReportsButton = document.getElementById('refreshReportsButton');
    const assessmentItems = [
        'head', 'neck', 'chest', 'lung_sounds', 'abdomen',
        'pelvis', 'right_leg', 'left_leg', 'right_arm', 'left_arm'
    ];
    let vitalSetCounter = 1;

    // Check user session (auth.js should handle redirection if not logged in)
    // However, we might want to fetch reports only if supabase client is available and user is logged in.
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient.auth) {
        window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchReports();
            } else {
                 // This case should ideally be handled by auth.js redirecting to index.html (the login page)
                console.log('No active session, not fetching reports.');
            }
        });
    } else {
        console.warn('Supabase client (window.supabaseClient) not found or auth module not available. PCR saving/loading will not work.');
        // Optionally hide report list and refresh button if Supabase is not available
        if(document.getElementById('reportListContainer')) {
            document.getElementById('reportListContainer').style.display = 'none';
        }
    }

    // Function to toggle assessment details visibility
    function toggleDetails(area) {
        const checkbox = document.getElementById(`assessment_${area}_wnl`);
        const detailsInput = document.getElementById(`assessment_${area}_details`);
        if (checkbox && detailsInput) {
            if (checkbox.checked) {
                detailsInput.style.display = 'none';
                detailsInput.value = ''; // Clear details if WNL
            } else {
                detailsInput.style.display = 'block';
            }
        }
    }

    // Add event listeners for assessment checkboxes
    assessmentItems.forEach(area => {
        const checkbox = document.getElementById(`assessment_${area}_wnl`);
        if (checkbox) {
            checkbox.addEventListener('change', () => toggleDetails(area));
        }
        // Ensure details are visible by default if not WNL, and WNL checkbox is not checked
        const detailsInput = document.getElementById(`assessment_${area}_details`);
        if (detailsInput && checkbox && !checkbox.checked) {
            detailsInput.style.display = 'block';
        } else if (detailsInput && checkbox && checkbox.checked) {
            detailsInput.style.display = 'none'; // Hide if WNL is checked by default (e.g. on load)
        }
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (typeof logout === 'function') {
                await logout(); // Call logout function from auth.js
            } else {
                console.error('Logout function not found.');
                alert('Error: Logout function is not available.');
            }
        });
    }

    // Renamed function to avoid conflict with the button's ID
    function addNewVitalSetToUI() {
        vitalSetCounter++;
        const newVitalSet = document.createElement('div');
        newVitalSet.classList.add('vital-set');
        newVitalSet.innerHTML = `
            <hr style="margin-top: 20px; margin-bottom: 20px;">
            <h4>Vital Set ${vitalSetCounter}</h4>
            <label for="vitalTime_${vitalSetCounter}">Time of Vitals:</label>
            <input type="time" id="vitalTime_${vitalSetCounter}" name="vitalTime_${vitalSetCounter}">

            <label for="bp_${vitalSetCounter}">Blood Pressure (SYS/DIA):</label>
            <input type="text" id="bp_${vitalSetCounter}" name="bp_${vitalSetCounter}" placeholder="e.g., 120/80">

            <label for="hr_${vitalSetCounter}">Heart Rate (BPM):</label>
            <input type="number" id="hr_${vitalSetCounter}" name="hr_${vitalSetCounter}">

            <label for="rr_${vitalSetCounter}">Respiratory Rate (RPM):</label>
            <input type="number" id="rr_${vitalSetCounter}" name="rr_${vitalSetCounter}">

            <label for="spo2_${vitalSetCounter}">SpO2 (%):</label>
            <input type="number" id="spo2_${vitalSetCounter}" name="spo2_${vitalSetCounter}">

            <label for="gcs_${vitalSetCounter}">GCS (E/V/M):</label>
            <input type="text" id="gcs_${vitalSetCounter}" name="gcs_${vitalSetCounter}" placeholder="e.g., 4/5/6">
        `;
        vitalsContainer.appendChild(newVitalSet);
    }

    if (addVitalSetButton) { // Check if the button exists before adding listener
        addVitalSetButton.addEventListener('click', addNewVitalSetToUI);
    }

    pcrForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent actual form submission

        const formData = new FormData(pcrForm);
        const reportId = formData.get('reportId'); // Get reportId from hidden field
        const data = {
            incidentDetails: {},
            patientInfo: {},
            vitalSets: [],
            assessment: {},
            narrative: ''
        };

        let currentVitalSet = {};
        let vitalSetIndex = 0;

        formData.forEach((value, key) => {
            if (key.startsWith('vitalTime_') || key.startsWith('bp_') || key.startsWith('hr_') || key.startsWith('rr_') || key.startsWith('spo2_') || key.startsWith('gcs_')) {
                const fieldName = key.substring(0, key.lastIndexOf('_'));
                const index = parseInt(key.substring(key.lastIndexOf('_') + 1), 10);

                if (index !== vitalSetIndex) {
                    if (Object.keys(currentVitalSet).length > 0) {
                        data.vitalSets.push(currentVitalSet);
                    }
                    currentVitalSet = {};
                    vitalSetIndex = index;
                }
                currentVitalSet[fieldName] = value;
            } else if (key === 'incidentDate' || key === 'incidentTime') { // Location removed
                data.incidentDetails[key] = value;
            } else if (key === 'patientAge' || key === 'patientGender' || key === 'chiefComplaint') {
                data.patientInfo[key] = value;
            } else if (key.startsWith('assessment_') && key.endsWith('_wnl')) {
                const assessmentArea = key.substring('assessment_'.length, key.lastIndexOf('_wnl'));
                if (!data.assessment[assessmentArea]) data.assessment[assessmentArea] = {};
                data.assessment[assessmentArea].wnl = formData.get(key) === 'wnl'; // Store as boolean
            } else if (key.startsWith('assessment_') && key.endsWith('_details')) {
                const assessmentArea = key.substring('assessment_'.length, key.lastIndexOf('_details'));
                if (!data.assessment[assessmentArea]) data.assessment[assessmentArea] = {};
                data.assessment[assessmentArea].details = value;
            } else if (key === 'narrative') {
                data.narrative = value;
            }
        });
        // Add the last processed vital set
        if (Object.keys(currentVitalSet).length > 0) {
            data.vitalSets.push(currentVitalSet);
        }

        console.log('Form Data Submitted:', data);

        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient.auth) {
            if (reportId) {
                updateReportInSupabase(reportId, data);
            } else {
                saveReportToSupabase(data);
            }
        } else {
            alert('Supabase client not available. Data logged to console only.');
            console.warn('Supabase client not available. Cannot save report to database.');
        }
        // pcrForm.reset(); // Consider how to reset dynamic fields or prompt user
        // vitalSetCounter = 1; // Reset counter if form is fully reset
        // vitalsContainer.innerHTML = ''; // Clear dynamic vitals - needs careful implementation with reset
    });

    async function saveReportToSupabase(reportData) {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('User not authenticated.');

            // Add user's full name to the report data
            if (user.user_metadata && user.user_metadata.full_name) {
                reportData.providerName = user.user_metadata.full_name;
            }

            const { data, error } = await window.supabaseClient
                .from('reports') // Ensure you have a 'reports' table in Supabase
                .insert([
                    { 
                        user_id: user.id, 
                        report_data: reportData, 
                        created_at: new Date().toISOString() 
                    }
                ])
                .select();

            if (error) throw error;
            console.log('Report saved to Supabase:', data);
            alert('Patient Care Report saved successfully!');
            fetchReports(); // Refresh the list of reports
            pcrForm.reset(); // Reset form after successful save
            resetVitalSetsUI(); // Reset vital sets UI
            clearAssessmentCheckboxes(); // Clear assessment checkboxes
            // Ensure detail boxes are reset to visible after saving a new report
            assessmentItems.forEach(area => {
                const detailsInput = document.getElementById(`assessment_${area}_details`);
                if (detailsInput) {
                    detailsInput.style.display = 'block'; // Make visible by default
                }
            });
        } catch (error) {
            console.error('Error saving report to Supabase:', error);
            alert('Failed to save report: ' + error.message);
        }
    }

    async function updateReportInSupabase(reportId, reportData) {
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) throw new Error('User not authenticated.');

            // Add user's full name to the report data
            if (user.user_metadata && user.user_metadata.full_name) {
                reportData.providerName = user.user_metadata.full_name;
            }

            const { data, error } = await window.supabaseClient
                .from('reports')
                .update({ report_data: reportData, updated_at: new Date().toISOString() })
                .eq('id', reportId)
                .eq('user_id', user.id) // Ensure user can only update their own reports
                .select();

            if (error) throw error;
            if (data && data.length > 0) {
                console.log('Report updated in Supabase:', data);
                alert('Patient Care Report updated successfully!');
                fetchReports(); // Refresh the list of reports
                pcrForm.reset(); // Reset form
                resetVitalSetsUI(); // Reset vital sets UI
                clearAssessmentCheckboxes(); // Clear assessment checkboxes
                // Ensure detail boxes are reset to visible after updating a report
                assessmentItems.forEach(area => {
                    const detailsInput = document.getElementById(`assessment_${area}_details`);
                    if (detailsInput) {
                        detailsInput.style.display = 'block'; // Make visible by default
                    }
                });
                document.getElementById('reportId').value = ''; // Clear hidden reportId
                const saveButton = pcrForm.querySelector('button[type="submit"]');
                if (saveButton) {
                    saveButton.textContent = 'Save Report'; // Reset button text
                }
            } else {
                // This case might happen if the reportId didn't match or user_id didn't match
                console.warn('Update operation did not return data. Report might not exist or user mismatch.');
                alert('Failed to update report. Please ensure the report exists and you have permission.');
            }
        } catch (error) {
            console.error('Error updating report in Supabase:', error);
            alert('Failed to update report: ' + error.message);
        }
    }

    async function fetchReports() {
        if (!reportList) return; // Don't try to fetch if the list element doesn't exist
        if (typeof window.supabaseClient === 'undefined' || !window.supabaseClient.auth) {
            console.warn('Supabase client (window.supabaseClient) not available for fetching reports.');
            reportList.innerHTML = '<li>Supabase not configured. Cannot load reports.</li>';
            return;
        }

        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            console.log('Attempting to fetch reports for user:', user);
            if (!user) {
                reportList.innerHTML = '<li>Please login to see your reports.</li>';
                console.log('No authenticated user found for fetching reports.');
                return;
            }

            const { data: reports, error } = await window.supabaseClient
                .from('reports')
                .select('id, created_at, incident_date:report_data->incidentDetails->incidentDate, chief_complaint:report_data->patientInfo->chiefComplaint') // Adjust selection as needed
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            console.log('Supabase fetch response - reports:', reports);
            console.log('Supabase fetch response - error:', error);

            if (error) {
                console.error('Error fetching reports from Supabase:', error);
                throw error;
            }

            reportList.innerHTML = ''; // Clear existing list
            if (reports && reports.length > 0) {
                console.log(`Found ${reports.length} reports. Populating list.`);
                reports.forEach(report => {
                    console.log('Full report object from Supabase:', JSON.stringify(report, null, 2));
                    console.log('Extracted incident_date:', report.incident_date);
                    console.log('Extracted chief_complaint from report object:', report.chief_complaint);
                    const listItem = document.createElement('li');
                    // Adjust date parsing to ensure it reflects the stored incident date correctly, accounting for UTC
                    const incidentDateStr = report.incident_date ? report.incident_date + 'T00:00:00Z' : null;
                    const date = incidentDateStr ? new Date(incidentDateStr).toLocaleDateString(undefined, { timeZone: 'UTC' }) : new Date(report.created_at).toLocaleDateString();
                    let title = report.chief_complaint || 'Untitled Report';
                    if (title === 'N/A' || !report.chief_complaint) title = 'Untitled Report'; // More robust check
                    console.log('Final title for display:', title);
                    listItem.innerHTML = `
                        <strong>${title}</strong> (<em>${date}</em>) <br>
                        <button class="view-report-btn" data-id="${report.id}">View</button>
                        <button class="edit-report-btn" data-id="${report.id}">Edit</button>
                        <button class="delete-report-btn" data-id="${report.id}">Delete</button>
                        <button class="download-pdf-btn" data-id="${report.id}">Download PDF</button>
                    `;
                    reportList.appendChild(listItem);
                });
                document.querySelectorAll('.view-report-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const reportId = e.target.getAttribute('data-id');
                        viewReport(reportId);
                    });
                });
                document.querySelectorAll('.edit-report-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const reportId = e.target.getAttribute('data-id');
                        editReport(reportId);
                    });
                });
                document.querySelectorAll('.delete-report-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const reportId = e.target.getAttribute('data-id');
                        deleteReport(reportId);
                    });
                });
                document.querySelectorAll('.download-pdf-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const reportId = e.target.getAttribute('data-id');
                        downloadReportAsPDF(reportId);
                    });
                });
            } else {
                reportList.innerHTML = '<li>No reports found.</li>';
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
            reportList.innerHTML = '<li>Error loading reports.</li>';
        }
    }

    async function viewReport(reportId) {
        try {
            const { data: report, error } = await window.supabaseClient
                .from('reports')
                .select('report_data')
                .eq('id', reportId)
                .single();
            
            if (error) throw error;
            if (report && report.report_data) {
                const formData = report.report_data;
                console.log('Populating form with report:', formData);

                // Populate hidden report ID for potential updates
                document.getElementById('reportId').value = reportId; 

                // Populate Incident Details
                document.getElementById('incidentDate').value = formData.incidentDetails?.incidentDate || '';
                document.getElementById('incidentTime').value = formData.incidentDetails?.incidentTime || '';
                // Location field removed from form

                // Populate Patient Information
                document.getElementById('patientAge').value = formData.patientInfo?.patientAge || '';
                document.getElementById('patientGender').value = formData.patientInfo?.patientGender || 'unknown';
                document.getElementById('chiefComplaint').value = formData.patientInfo?.chiefComplaint || '';

                // Populate Narrative
                document.getElementById('narrative').value = formData.narrative || ''; // Corrected: formData.narrative is the string

                // Populate Vital Signs
                const vitalsContainer = document.getElementById('vitalsContainer');
                vitalsContainer.innerHTML = ''; // Clear existing vital sets
                let vitalSetCounter = 0;
                // Corrected: Use formData.vitalSets to match saving logic
                if (formData.vitalSets && formData.vitalSets.length > 0) {
                    formData.vitalSets.forEach((vitalSet, index) => {
                        vitalSetCounter = index + 1;
                        const vitalSetDiv = document.createElement('div');
                        vitalSetDiv.classList.add('vital-set');
                        vitalSetDiv.innerHTML = `
                            <h4>Vital Set ${vitalSetCounter}</h4>
                            <label for="vitalTime_${vitalSetCounter}">Time of Vitals:</label>
                            <input type="time" id="vitalTime_${vitalSetCounter}" name="vitalTime_${vitalSetCounter}" value="${vitalSet.vitalTime || ''}">

                            <label for="bp_${vitalSetCounter}">Blood Pressure (SYS/DIA):</label>
                            <input type="text" id="bp_${vitalSetCounter}" name="bp_${vitalSetCounter}" placeholder="e.g., 120/80" value="${vitalSet.bp || ''}">

                            <label for="hr_${vitalSetCounter}">Heart Rate (BPM):</label>
                            <input type="number" id="hr_${vitalSetCounter}" name="hr_${vitalSetCounter}" value="${vitalSet.hr || ''}">

                            <label for="rr_${vitalSetCounter}">Respiratory Rate (RPM):</label>
                            <input type="number" id="rr_${vitalSetCounter}" name="rr_${vitalSetCounter}" value="${vitalSet.rr || ''}">

                            <label for="spo2_${vitalSetCounter}">SpO2 (%):</label>
                            <input type="number" id="spo2_${vitalSetCounter}" name="spo2_${vitalSetCounter}" value="${vitalSet.spo2 || ''}">

                            <label for="gcs_${vitalSetCounter}">GCS (E/V/M):</label>
                            <input type="text" id="gcs_${vitalSetCounter}" name="gcs_${vitalSetCounter}" placeholder="e.g., 4/5/6" value="${vitalSet.gcs || ''}">
                        `;
                        vitalsContainer.appendChild(vitalSetDiv);
                    });
                } else {
                    // If no vital signs, add one empty set
                    addNewVitalSetToUI(); 
                }
                // Update the global vitalSetCounter if it exists, or handle locally if not.
                // This assumes vitalSetCounter is accessible or managed within this scope for adding new sets after viewing.
                // If addVitalSet relies on a global vitalSetCounter, ensure it's updated.
                window.vitalSetCounter = vitalSetCounter; // This assumes vitalSetCounter is global for addVitalSet functionality

                // Populate assessment checkboxes
                clearAssessmentCheckboxes(); // Clear existing state
                if (formData.assessment) {
                    populateAssessmentCheckboxes(formData.assessment);
                }

                // Change button text for editing mode if applicable
                const saveButton = pcrForm.querySelector('button[type="submit"]');
                if (saveButton) {
                    saveButton.textContent = 'Update Report';
                }

                alert('Report loaded into the form for viewing/editing.');
            } else {
                alert('Report data not found.');
            }

        } catch (error) {
            console.error('Error fetching report details:', error);
            alert('Error fetching report details: ' + error.message);
        }
    }

    async function editReport(reportId) {
        // Load the report data into the form (viewReport already does this)
        await viewReport(reportId);
        // The viewReport function now also sets the reportId in the hidden field and changes button text.
        // Focus on the first form field or scroll to form might be good UX here.
        document.getElementById('incidentDate').focus();
    }

    async function deleteReport(reportId) {
        if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            return;
        }
        try {
            const { error } = await window.supabaseClient
                .from('reports')
                .delete()
                .eq('id', reportId);
            if (error) throw error;
            alert('Report deleted successfully.');
            fetchReports(); // Refresh the list
        } catch (error) {
            console.error('Error deleting report:', error);
            alert('Failed to delete report: ' + error.message);
        }
    }

    async function downloadReportAsPDF(reportId) {
        try {
            const { data: report, error } = await window.supabaseClient
                .from('reports')
                .select('report_data, created_at')
                .eq('id', reportId)
                .single();

            if (error) throw error;
            if (!report || !report.report_data) {
                alert('Report data not found for PDF generation.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const reportData = report.report_data;
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
                // Check if yPos would exceed page height, add new page if so
                if (yPos + lineHeight > doc.internal.pageSize.height - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(itemText, margin + 5, yPos); yPos += lineHeight;
            });
            yPos += lineHeight; // Extra space after assessment section

            doc.setFontSize(14);
            doc.text('Narrative', margin, yPos); yPos += lineHeight;
            doc.setFontSize(10);
            // Check if yPos would exceed page height before adding narrative
            if (yPos + (doc.splitTextToSize(reportData.narrative || 'No narrative provided.', 180).length * lineHeight) > doc.internal.pageSize.height - margin) {
                doc.addPage();
                yPos = margin;
                 // Re-add title if narrative starts on a new page
                doc.setFontSize(14);
                doc.text('Narrative (continued)', margin, yPos); yPos += lineHeight;
                doc.setFontSize(10);
            }
            const narrativeLines = doc.splitTextToSize(reportData.narrative || 'No narrative provided.', 180);
            doc.text(narrativeLines, margin + 5, yPos);
            
            doc.save(`PCR_Report_${reportId}.pdf`);
            alert('PDF download initiated.');

        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF: ' + error.message);
        }
    }

    if (refreshReportsButton) {
        refreshReportsButton.addEventListener('click', fetchReports);
    }

    function populateAssessmentCheckboxes(assessmentData) {
        console.log("Populating assessment with data:", assessmentData);
        assessmentItems.forEach(area => {
            const wnlCheckbox = document.getElementById(`assessment_${area}_wnl`);
            const detailsInput = document.getElementById(`assessment_${area}_details`);

            if (wnlCheckbox && detailsInput) {
                if (assessmentData && assessmentData[area]) {
                    wnlCheckbox.checked = assessmentData[area].wnl || false;
                    detailsInput.value = assessmentData[area].details || '';
                    detailsInput.style.display = wnlCheckbox.checked ? 'none' : 'block';
                } else {
                    // Default state: WNL unchecked, details visible and empty
                    wnlCheckbox.checked = false;
                    detailsInput.value = '';
                    detailsInput.style.display = 'block';
                }
            } else {
                console.warn(`Checkbox or details input not found for assessment area: ${area}`);
            }
        });
    }

    function clearAssessmentCheckboxes() {
        assessmentItems.forEach(area => {
            const wnlCheckbox = document.getElementById(`assessment_${area}_wnl`);
            const detailsInput = document.getElementById(`assessment_${area}_details`);
            if (wnlCheckbox) {
                wnlCheckbox.checked = false;
            }
            if (detailsInput) {
                detailsInput.value = '';
                detailsInput.style.display = 'block'; // Default to visible when form is cleared
            }
        });
    }

    if (clearFormButton) {
        clearFormButton.addEventListener('click', () => {
            pcrForm.reset();
            resetVitalSetsUI();
            clearAssessmentCheckboxes();
            document.getElementById('reportId').value = ''; // Clear hidden reportId
            const saveButton = pcrForm.querySelector('button[type="submit"]');
            if (saveButton) {
                saveButton.textContent = 'Save Report';
            }
        });
    }

    function resetVitalSetsUI() {
        vitalsContainer.innerHTML = `
            <div class="vital-set">
                <h4>Vital Set 1</h4>
                <label for="vitalTime_1">Time of Vitals:</label>
                    <input type="time" id="vitalTime_1" name="vitalTime_1">

                    <label for="bp_1">Blood Pressure (SYS/DIA):</label>
                    <input type="text" id="bp_1" name="bp_1" placeholder="e.g., 120/80">

                    <label for="hr_1">Heart Rate (BPM):</label>
                    <input type="number" id="hr_1" name="hr_1">

                    <label for="rr_1">Respiratory Rate (RPM):</label>
                    <input type="number" id="rr_1" name="rr_1">

                    <label for="spo2_1">SpO2 (%):</label>
                    <input type="number" id="spo2_1" name="spo2_1">

                    <label for="gcs_1">GCS (E/V/M):</label>
                    <input type="text" id="gcs_1" name="gcs_1" placeholder="e.g., 4/5/6">
                </div>
            `;
            vitalSetCounter = 1;
    }
});