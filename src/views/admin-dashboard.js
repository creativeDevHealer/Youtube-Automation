let apiKey = localStorage.getItem('adminApiKey');
let commentActionsTable;
let processedVideosTable;
let superfansTable;

// Initialize on document ready
$(document).ready(function() {
    setupMobileMenu();
    
    if (!apiKey) {
        $('#authModal').modal('show');
    } else {
        initializeDashboard();
    }
    
    // Initialize thumbnail functionality
    initializeThumbnailStyleSelector();
    initializeThumbnailForm();
    initializeThumbnailClickHandlers();
});

// Mobile menu functionality
function setupMobileMenu() {
    $('#mobileMenuBtn').on('click', function() {
        $('#sidebar').addClass('show');
        $('#sidebarOverlay').addClass('show');
    });

    $('#sidebarOverlay').on('click', function() {
        $('#sidebar').removeClass('show');
        $('#sidebarOverlay').removeClass('show');
    });

    // Handle navigation
    $('.nav-link').on('click', function(e) {
        const section = $(this).data('section');
        
        // Update URL hash
        window.location.hash = section;
        
        // Close mobile menu
        $('#sidebar').removeClass('show');
        $('#sidebarOverlay').removeClass('show');
    });

    // Handle hash changes (including initial page load)
    function handleHashChange() {
        let hash = window.location.hash.replace('#', '') || 'dashboard';
        
        // Update active state
        $('.nav-link').removeClass('active');
        $(`.nav-link[data-section="${hash}"]`).addClass('active');
        
        // Show/hide sections
        $('.content-section').addClass('d-none');
        $(`#${hash}-section`).removeClass('d-none');
        
        // Debug: Log what sections are visible
        
        // Redraw tables
        setTimeout(() => {
            if (hash === 'comment-actions' && commentActionsTable) {
                commentActionsTable.columns.adjust().draw();
            }
            if (hash === 'processed-videos' && processedVideosTable) {
                processedVideosTable.columns.adjust().draw();
            }
            if (hash === 'superfans' && superfansTable) {
                superfansTable.columns.adjust().draw();
            }
        }, 100);
    }

    // Listen for hash changes
    $(window).on('hashchange', handleHashChange);
    
    // Handle initial page load
    handleHashChange();
}

// Handle authentication
$('#authForm').on('submit', function(e) {
    e.preventDefault();
    const inputApiKey = $('#apiKey').val();
    
    $.ajax({
        url: '/admin/stats',
        headers: { 'X-API-Key': inputApiKey },
        success: function() {
            apiKey = inputApiKey;
            localStorage.setItem('adminApiKey', apiKey);
            $('#authModal').modal('hide');
            initializeDashboard();
        },
        error: function() {
            $('#authError').removeClass('d-none').text('Invalid API key. Please try again.');
        }
    });
});

// Helper function to manually show thumbnail update section (for debugging)
window.showThumbnailUpdate = function() {
    $('.content-section').addClass('d-none');
    $('#thumbnail-update-section').removeClass('d-none');
    $('.nav-link').removeClass('active');
    $('[data-section="thumbnail-update"]').addClass('active');
    window.location.hash = 'thumbnail-update';
};

// Initialize dashboard
function initializeDashboard() {
    loadStats();
    initializeDataTables();
}

// Load statistics
function loadStats() {
    $.ajax({
        url: '/admin/stats',
        headers: { 'X-API-Key': apiKey },
        success: function(data) {
            // Provide default values to prevent undefined errors
            const stats = {
                repliedCommentCount: data.repliedCommentCount || 0,
                deletedCommentCount: data.deletedCommentCount || 0,
                bonusVideoCount: data.bonusVideoCount || 0,
                weeklyVideoCount: data.weeklyVideoCount || 0,
                totalSuperfans: data.totalSuperfans || 0,
                activeSuperfans: data.activeSuperfans || 0
            };

            const statsHtml = `
                <div class="stat-card">
                    <div class="stat-header">
                        <p class="stat-title">Replied Comments</p>
                        <div class="stat-icon success">
                            <i class="fas fa-reply"></i>
                        </div>
                    </div>
                    <p class="stat-value">${stats.repliedCommentCount.toLocaleString()}</p>
                    <p class="stat-change">Comments with AI replies</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <p class="stat-title">Deleted Comments</p>
                        <div class="stat-icon warning">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                    </div>
                    <p class="stat-value">${stats.deletedCommentCount.toLocaleString()}</p>
                    <p class="stat-change">Comments moderated</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <p class="stat-title">Bonus Videos</p>
                        <div class="stat-icon primary">
                            <i class="fas fa-star"></i>
                        </div>
                    </div>
                    <p class="stat-value">${stats.bonusVideoCount.toLocaleString()}</p>
                    <p class="stat-change">Bonus videos processed</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <p class="stat-title">Weekly Forecasts</p>
                        <div class="stat-icon info">
                            <i class="fas fa-calendar-week"></i>
                        </div>
                    </div>
                    <p class="stat-value">${stats.weeklyVideoCount.toLocaleString()}</p>
                    <p class="stat-change">Weekly forecast videos</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <p class="stat-title">Total Superfans</p>
                        <div class="stat-icon success">
                            <i class="fas fa-crown"></i>
                        </div>
                    </div>
                    <p class="stat-value">${stats.totalSuperfans.toLocaleString()}</p>
                    <p class="stat-change">Engaged community members</p>
                </div>
                <div class="stat-card">
                    <div class="stat-header">
                        <p class="stat-title">Active Superfans</p>
                        <div class="stat-icon primary">
                            <i class="fas fa-fire"></i>
                        </div>
                    </div>
                    <p class="stat-value">${stats.activeSuperfans.toLocaleString()}</p>
                    <p class="stat-change">Recently active superfans</p>
                </div>
            `;
            $('#statsCards').html(statsHtml);
        },
        error: function(xhr, status, error) {
            console.error('Error loading stats:', error);
            $('#statsCards').html(`
                <div class="col-12">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Unable to load statistics. Please try refreshing the page.
                    </div>
                </div>
            `);
        }
    });
}

// Initialize DataTables
function initializeDataTables() {
    // Check if DataTable instances already exist and destroy them
    if ($.fn.DataTable.isDataTable('#commentActionsTable')) {
        $('#commentActionsTable').DataTable().destroy();
    }
    if ($.fn.DataTable.isDataTable('#processedVideosTable')) {
        $('#processedVideosTable').DataTable().destroy();
    }
    if ($.fn.DataTable.isDataTable('#superfansTable')) {
        $('#superfansTable').DataTable().destroy();
    }
    
    // Comment Actions Table
    commentActionsTable = $('#commentActionsTable').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: '/admin/comment-actions',
            type: 'GET',
            headers: { 'X-API-Key': apiKey },
            data: function(d) {
                return d;
            },
            dataSrc: function(json) {
                return json.data;
            },
            error: function(xhr, error, thrown) {
                console.error('DataTables error (comment-actions):', error, thrown);
                console.error('Response:', xhr.responseText);
                console.error('Status:', xhr.status);
            }
        },
        columns: [
            { 
                data: 0, 
                name: 'processedAt',
                title: 'Date', 
                orderable: true,
                searchable: false
            },
            { 
                data: 1, 
                name: 'videoTitle',
                title: 'Video', 
                orderable: true,
                searchable: true
            },
            { 
                data: 2, 
                name: 'actionType',
                title: 'Action',
                orderable: true,
                searchable: true,
                render: function(data) {
                    const badgeClass = data === 'deleted' ? 'bg-danger' : 'bg-success';
                    return `<span class="badge ${badgeClass}">${data}</span>`;
                }
            },
            { 
                data: 3, 
                name: 'commentText',
                title: 'Comment', 
                orderable: false,
                searchable: true
            },
            { 
                data: 4, 
                name: 'authorDisplayName',
                title: 'Author', 
                orderable: true,
                searchable: true
            },
            { 
                data: 5, 
                name: 'memberStatus',
                title: 'Status',
                orderable: true,
                searchable: false,
                render: function(data) {
                    if (data === 'none') return '<span class="badge bg-secondary">None</span>';
                    return `<span class="badge bg-primary">${data}</span>`;
                }
            },
            { 
                data: 6, 
                name: 'reason',
                title: 'Reason', 
                orderable: false,
                searchable: true
            },
            { 
                data: 7, 
                name: 'actions',
                title: 'Actions', 
                orderable: false,
                searchable: false,
                render: function(data) {
                    return data; // HTML buttons are already formatted in the server response
                }
            }
        ],
        order: [[0, 'desc']],
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        responsive: true,
        searchDelay: 500,
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search actions...",
            processing: "Loading...",
            emptyTable: "No comment actions found",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "Showing 0 to 0 of 0 entries",
            infoFiltered: "(filtered from _MAX_ total entries)"
        }
    });

    // Processed Videos Table
    processedVideosTable = $('#processedVideosTable').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: '/admin/processed-videos',
            type: 'GET',
            headers: { 'X-API-Key': apiKey },
            data: function(d) {
                return d;
            },
            dataSrc: function(json) {
                return json.data;
            },
            error: function(xhr, error, thrown) {
                console.error('DataTables error (processed-videos):', error, thrown);
                console.error('Response:', xhr.responseText);
                console.error('Status:', xhr.status);
            }
        },
        columns: [
            { 
                data: 0, 
                name: 'createdAt',
                title: 'Created', 
                orderable: true,
                searchable: false
            },
            { 
                data: 1, 
                name: 'videoTitle',
                title: 'Video Title', 
                orderable: true,
                searchable: true
            },
            { 
                data: 2, 
                name: 'videoType',
                title: 'Type',
                orderable: true,
                searchable: true,
                render: function(data) {
                    const badgeMap = {
                        'bonus_video': 'bg-warning',
                        'weekly_forecast': 'bg-info',
                        'livestream': 'bg-danger',
                        'regular': 'bg-success'
                    };
                    const badgeClass = badgeMap[data] || 'bg-secondary';
                    return `<span class="badge ${badgeClass}">${data.replace('_', ' ')}</span>`;
                }
            },
            { 
                data: 3, 
                name: 'zodiacSign',
                title: 'Zodiac', 
                orderable: true,
                searchable: true
            },
            { 
                data: 4, 
                name: 'weekRange',
                title: 'Week', 
                orderable: true,
                searchable: true
            },
            { 
                data: 5, 
                name: 'updatedAt',
                title: 'Updated', 
                orderable: true,
                searchable: false
            },
            { 
                data: 6, 
                name: 'actions',
                title: 'Actions', 
                orderable: false,
                searchable: false,
                render: function(data) {
                    return data; // HTML buttons are already formatted in the server response
                }
            }
        ],
        order: [[0, 'desc']],
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        responsive: true,
        searchDelay: 500,
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search videos...",
            processing: "Loading...",
            emptyTable: "No processed videos found",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "Showing 0 to 0 of 0 entries",
            infoFiltered: "(filtered from _MAX_ total entries)"
        }
    });

    // Superfans Table
    superfansTable = $('#superfansTable').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: '/admin/superfans',
            type: 'GET',
            headers: { 'X-API-Key': apiKey },
            data: function(d) {
                return d;
            },
            dataSrc: function(json) {
                return json.data;
            },
            error: function(xhr, error, thrown) {
                console.error('DataTables error (superfans):', error, thrown);
                console.error('Response:', xhr.responseText);
                console.error('Status:', xhr.status);
            }
        },
        columns: [
            { 
                data: 0, 
                name: 'displayName',
                title: 'Display Name', 
                orderable: true,
                searchable: true
            },
            { 
                data: 1, 
                name: 'superfanScore',
                title: 'Superfan Score',
                orderable: true,
                searchable: false,
                render: function(data) {
                    const score = parseInt(data) || 0;
                    let badgeClass = 'bg-secondary';
                    if (score >= 100) badgeClass = 'bg-success';
                    else if (score >= 50) badgeClass = 'bg-warning';
                    else if (score >= 25) badgeClass = 'bg-info';
                    return `<span class="badge ${badgeClass}">${score}</span>`;
                }
            },
            { 
                data: 2, 
                name: 'membershipLevel',
                title: 'Membership Level',
                orderable: true,
                searchable: true,
                render: function(data) {
                    const level = data || 'none';
                    const badgeMap = {
                        'tier3': 'bg-danger',
                        'tier2': 'bg-warning',
                        'tier1': 'bg-info',
                        'none': 'bg-secondary'
                    };
                    const badgeClass = badgeMap[level] || 'bg-secondary';
                    return `<span class="badge ${badgeClass}">${level.toUpperCase()}</span>`;
                }
            },
            { 
                data: 3, 
                name: 'totalComments',
                title: 'Total Comments',
                orderable: true,
                searchable: false
            },
            { 
                data: 4, 
                name: 'lastCommentAt',
                title: 'Last Comment',
                orderable: true,
                searchable: false
            },
            { 
                data: 5, 
                name: 'memberSince',
                title: 'Member Since',
                orderable: true,
                searchable: false
            },
            { 
                data: 6, 
                name: 'isActive',
                title: 'Status',
                orderable: true,
                searchable: false,
                render: function(data) {
                    return data; // HTML badges are already formatted in the server response
                }
            },
            { 
                data: 7, 
                name: 'actions',
                title: 'Actions',
                orderable: false,
                searchable: false,
                render: function(data) {
                    return data; // HTML buttons are already formatted in the server response
                }
            }
        ],
        order: [[1, 'desc']], // Sort by superfan score descending
        pageLength: 25,
        lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
        responsive: true,
        searchDelay: 500,
        language: {
            search: "_INPUT_",
            searchPlaceholder: "Search superfans...",
            processing: "Loading...",
            emptyTable: "No superfans found",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            infoEmpty: "Showing 0 to 0 of 0 entries",
            infoFiltered: "(filtered from _MAX_ total entries)"
        }
    });
} 

// Thumbnail Style Selector functionality
function initializeThumbnailStyleSelector() {
    // Set default selection (first option)
    $('.style-option[data-style="template1"]').addClass('selected');
    $('#thumbnailStyle').val('template1');
    
    // Handle style option clicks
    $('.style-option').on('click', function() {
        const selectedStyle = $(this).data('style');
        
        // Remove selected class from all options
        $('.style-option').removeClass('selected');
        
        // Add selected class to clicked option
        $(this).addClass('selected');
        
        // Update hidden input value
        $('#thumbnailStyle').val(selectedStyle);
        
        // Optional: Add haptic feedback for mobile
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    });
}

// Handle thumbnail form submission
function initializeThumbnailForm() {
    $('#thumbnailForm').on('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            title: $('#title').val(),
            content: $('#content').val(),
            subtitle: $('#subtitle').val(),
            weekRange: $('#weekRange').val(),
            thumbnailStyle: $('#thumbnailStyle').val()
        };
        
        // Add loading state to button
        const $submitBtn = $(this).find('button[type="submit"]');
        const originalText = $submitBtn.html();
        $submitBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>Generating...').prop('disabled', true);
        
        // Clear any previous results
        $('#thumbnailResultsSection').hide();
        
        // API call to generate thumbnail
        $.ajax({
            url: '/admin/generate-thumbnail',
            method: 'POST',
            headers: { 
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(formData),
            success: function(response) {
                // Show thumbnail results with images
                showThumbnailResults(response);
                
                // Show success message with counts
                const message = response.failedCount > 0 
                    ? `Generated ${response.generatedCount} thumbnails successfully. ${response.failedCount} failed.`
                    : `All ${response.generatedCount} thumbnails generated successfully!`;
                
                showNotification(message, response.failedCount > 0 ? 'warning' : 'success');
            },
            error: function(xhr, status, error) {
                console.error('Error generating thumbnail:', error);
                let errorMessage = 'Failed to generate thumbnail. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMessage = xhr.responseJSON.error;
                }
                
                showNotification(errorMessage, 'error');
            },
            complete: function() {
                // Restore button state
                $submitBtn.html(originalText).prop('disabled', false);
            }
        });
    });
}

// Show thumbnail generation results with images
function showThumbnailResults(response) {
    const $resultsSection = $('#thumbnailResultsSection');
    const $resultsContainer = $('#thumbnailResults');
    
    if (!response.results && !response.errors) {
        $resultsSection.hide();
        return;
    }
    
    let resultsHtml = '';
    
    // Success results - show thumbnails
    if (response.results && response.results.length > 0) {
        resultsHtml += '<div class="mb-4">';
        resultsHtml += '<h6 class="text-success mb-3"><i class="fas fa-check-circle me-2"></i>Successfully Generated</h6>';
        resultsHtml += '<div class="row g-3">';
        
        response.results.forEach(result => {
            const thumbnailUrl = `/views/thumbnails/thumbnail-${result.sign.toLowerCase()}.png`;
            
            resultsHtml += `
                <div class="col-md-2 col-sm-3 col-4">
                    <div class="card h-100 thumbnail-card">
                        <div class="card-body p-2">
                            <div class="text-center mb-2">
                                <img src="${thumbnailUrl}" 
                                     class="img-fluid rounded thumbnail-image thumbnail-clickable" 
                                     alt="${result.sign} Thumbnail" 
                                     style="max-height: 100px; object-fit: cover; cursor: pointer;"
                                     data-thumbnail-url="${thumbnailUrl}"
                                     data-zodiac-sign="${result.sign}">
                            </div>
                            <h6 class="card-title text-center mb-2" style="font-size: 0.8rem;">${result.sign}</h6>
                            <div class="mb-1">
                                <label class="form-label" style="font-size: 0.7rem;">Video ID:</label>
                                <input type="text" 
                                       class="form-control form-control-sm video-id-input" 
                                       placeholder="Enter video ID"
                                       data-sign="${result.sign.toLowerCase()}"
                                       style="font-size: 0.7rem;">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsHtml += '</div></div>';
    }
    
    // Failed results
    if (response.errors && response.errors.length > 0) {
        resultsHtml += '<div class="mb-3">';
        resultsHtml += '<h6 class="text-warning mb-3"><i class="fas fa-exclamation-triangle me-2"></i>Generation Failed</h6>';
        resultsHtml += '<div class="row g-2">';
        
        response.errors.forEach(error => {
            resultsHtml += `
                <div class="col-md-2 col-sm-3 col-4">
                    <div class="card border-warning h-100">
                        <div class="card-body p-2">
                            <div class="text-center mb-2">
                                <div class="d-flex align-items-center justify-content-center" 
                                     style="height: 100px; background-color: #f8f9fa; border-radius: 4px;">
                                    <i class="fas fa-exclamation-triangle text-warning" style="font-size: 2rem;"></i>
                                </div>
                            </div>
                            <h6 class="card-title text-center mb-2" style="font-size: 0.8rem;">${error.sign}</h6>
                            <div class="mb-1">
                                <small class="text-muted" style="font-size: 0.65rem;" title="${error.error}">
                                    Generation failed
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsHtml += '</div></div>';
    }
    
    // Summary and Update Button
    if (response.generatedCount || response.failedCount) {
        resultsHtml += '<div class="alert alert-info">';
        resultsHtml += '<strong><i class="fas fa-info-circle me-2"></i>Summary:</strong> ';
        resultsHtml += `${response.generatedCount || 0} successful, ${response.failedCount || 0} failed out of 12 zodiac signs.`;
        resultsHtml += '</div>';
        
        // Add Update Thumbnail button if we have successful results
        if (response.results && response.results.length > 0) {
            resultsHtml += '<div class="d-grid gap-2 mt-3">';
            resultsHtml += '<button type="button" class="btn btn-success btn-lg" id="updateThumbnailBtn">';
            resultsHtml += '<i class="fas fa-upload me-2"></i>Update Thumbnails to Videos';
            resultsHtml += '</button>';
            resultsHtml += '<small class="text-muted text-center">This will update thumbnails for videos with entered Video IDs</small>';
            resultsHtml += '</div>';
        }
    }
    
    $resultsContainer.html(resultsHtml);
    $resultsSection.show();
    
    // Initialize update button click handler
    $('#updateThumbnailBtn').on('click', handleUpdateThumbnails);
    
    // Scroll to results section
    $('html, body').animate({
        scrollTop: $resultsSection.offset().top - 100
    }, 500);
}

// Show thumbnail in modal - make it globally accessible
window.showThumbnailModal = function(thumbnailUrl, zodiacSign) {
    console.log('showThumbnailModal called with:', thumbnailUrl, zodiacSign);
    $('#modalThumbnailImage').attr('src', thumbnailUrl);
    $('#thumbnailModalLabel').text(`${zodiacSign} Thumbnail`);
    $('#downloadThumbnailBtn').attr('href', thumbnailUrl).attr('download', `thumbnail-${zodiacSign.toLowerCase()}.png`);
    $('#thumbnailModal').modal('show');
}

// Get all video IDs from input fields
function getAllVideoIds() {
    const videoIds = {};
    $('.video-id-input').each(function() {
        const sign = $(this).data('sign');
        const videoId = $(this).val().trim();
        if (videoId) {
            videoIds[sign] = videoId;
        }
    });
    return videoIds;
}

// Set video ID for a specific zodiac sign
function setVideoId(zodiacSign, videoId) {
    $(`.video-id-input[data-sign="${zodiacSign.toLowerCase()}"]`).val(videoId);
}

// Initialize thumbnail click handlers
function initializeThumbnailClickHandlers() {
    // Use event delegation to handle thumbnail clicks
    $(document).on('click', '.thumbnail-clickable', function() {
        const thumbnailUrl = $(this).data('thumbnail-url');
        const zodiacSign = $(this).data('zodiac-sign');
        
        console.log('Thumbnail clicked:', thumbnailUrl, zodiacSign);
        
        if (thumbnailUrl && zodiacSign) {
            showThumbnailModal(thumbnailUrl, zodiacSign);
        } else {
            console.error('Missing thumbnail data:', { thumbnailUrl, zodiacSign });
        }
    });
}

// Handle update thumbnails button click
function handleUpdateThumbnails() {
    const videoIds = getAllVideoIds();
    
    // Check if any video IDs are entered
    if (Object.keys(videoIds).length === 0) {
        showNotification('Please enter at least one Video ID to update thumbnails.', 'warning');
        return;
    }
    
    // Confirm action
    const videoCount = Object.keys(videoIds).length;
    const zodiacList = Object.keys(videoIds).map(sign => sign.toUpperCase()).join(', ');
    
    if (!confirm(`Are you sure you want to update thumbnails for ${videoCount} videos?\n\nZodiac signs: ${zodiacList}`)) {
        return;
    }
    
    // Add loading state to button
    const $updateBtn = $('#updateThumbnailBtn');
    const originalText = $updateBtn.html();
    $updateBtn.html('<i class="fas fa-spinner fa-spin me-2"></i>Updating Thumbnails...').prop('disabled', true);
    
    // Prepare thumbnail paths for each video ID
    const updateData = {};
    Object.keys(videoIds).forEach(zodiacSign => {
        updateData[videoIds[zodiacSign]] = {
            zodiacSign: zodiacSign.toUpperCase(),
            thumbnailPath: `/views/thumbnails/thumbnail-${zodiacSign.toLowerCase()}.png`
        };
    });
    
    // API call to update thumbnails
    $.ajax({
        url: '/admin/update-thumbnails',
        method: 'POST',
        headers: { 
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            videoUpdates: updateData
        }),
        success: function(response) {
            // Show success message
            const successCount = response.successCount || 0;
            const failedCount = response.failedCount || 0;
            
            let message;
            if (failedCount === 0) {
                message = `All ${successCount} video thumbnails updated successfully!`;
                showNotification(message, 'success');
            } else {
                message = `${successCount} thumbnails updated successfully, ${failedCount} failed.`;
                showNotification(message, 'warning');
                
                // Show details of failed updates if any
                if (response.errors && response.errors.length > 0) {
                    console.error('Failed updates:', response.errors);
                }
            }
            
            // Show detailed results
            if (response.results || response.errors) {
                showUpdateResults(response);
            }
        },
        error: function(xhr, status, error) {
            console.error('Error updating thumbnails:', error);
            let errorMessage = 'Failed to update thumbnails. Please try again.';
            
            if (xhr.responseJSON && xhr.responseJSON.error) {
                errorMessage = xhr.responseJSON.error;
            }
            
            showNotification(errorMessage, 'error');
        },
        complete: function() {
            // Restore button state
            $updateBtn.html(originalText).prop('disabled', false);
        }
    });
}

// Show update results
function showUpdateResults(response) {
    let resultsHtml = '<div class="mt-3"><h6><i class="fas fa-chart-bar me-2"></i>Update Results</h6>';
    
    // Success results
    if (response.results && response.results.length > 0) {
        resultsHtml += '<div class="alert alert-success"><strong>Successfully Updated:</strong><br>';
        response.results.forEach(result => {
            resultsHtml += `<span class="badge bg-success me-1">${result.zodiacSign} (${result.videoId})</span>`;
        });
        resultsHtml += '</div>';
    }
    
    // Failed results
    if (response.errors && response.errors.length > 0) {
        resultsHtml += '<div class="alert alert-danger"><strong>Failed to Update:</strong><br>';
        response.errors.forEach(error => {
            resultsHtml += `<span class="badge bg-danger me-1" title="${error.error}">${error.zodiacSign} (${error.videoId})</span>`;
        });
        resultsHtml += '</div>';
    }
    
    resultsHtml += '</div>';
    
    // Append results after the thumbnail results
    $('#thumbnailResults').append(resultsHtml);
}

// Notification helper function
function showNotification(message, type = 'info') {
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 'alert-info';
    
    const notification = $(`
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    
    $('body').append(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.alert('close');
    }, 5000);
}

// ==================== ACTION HANDLERS ====================

// Comment Action Functions
function viewCommentAction(actionId) {
    $.ajax({
        url: `/admin/comment-action/${actionId}`,
        headers: { 'X-API-Key': apiKey },
        success: function(data) {
            showCommentActionDetails(data);
        },
        error: function(xhr, status, error) {
            console.error('Error fetching comment action:', error);
            showNotification('Failed to load comment action details', 'error');
        }
    });
}

function showCommentActionDetails(data) {
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6>Basic Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>Date:</strong></td><td>${new Date(data.processedAt).toLocaleString()}</td></tr>
                    <tr><td><strong>Action Type:</strong></td><td><span class="badge ${data.actionType === 'deleted' ? 'bg-danger' : 'bg-success'}">${data.actionType}</span></td></tr>
                    <tr><td><strong>Video Title:</strong></td><td>${data.videoTitle}</td></tr>
                    <tr><td><strong>Video ID:</strong></td><td><code>${data.videoId}</code></td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>Author Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>Author:</strong></td><td>${data.authorDisplayName || 'N/A'}</td></tr>
                    <tr><td><strong>Channel ID:</strong></td><td><code>${data.authorChannelId || 'N/A'}</code></td></tr>
                    <tr><td><strong>Member Status:</strong></td><td><span class="badge bg-primary">${data.memberStatus || 'none'}</span></td></tr>
                    <tr><td><strong>Comment ID:</strong></td><td><code>${data.commentId}</code></td></tr>
                </table>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <h6>Comment Text</h6>
                <div class="alert alert-light">
                    <p class="mb-0">${data.commentText}</p>
                </div>
                ${data.repliedComment ? `
                    <h6>AI Reply</h6>
                    <div class="alert alert-success">
                        <p class="mb-0">${data.repliedComment}</p>
                    </div>
                ` : ''}
                ${data.reason ? `
                    <h6>Reason</h6>
                    <div class="alert alert-info">
                        <p class="mb-0">${data.reason}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    $('#commentActionDetails').html(detailsHtml);
    $('#viewVideoBtn').attr('href', `https://youtube.com/watch?v=${data.videoId}`);
    $('#commentActionModal').modal('show');
}



// Processed Video Functions
function viewProcessedVideo(videoId) {
    $.ajax({
        url: `/admin/processed-video/${videoId}`,
        headers: { 'X-API-Key': apiKey },
        success: function(data) {
            showProcessedVideoDetails(data);
        },
        error: function(xhr, status, error) {
            console.error('Error fetching processed video:', error);
            showNotification('Failed to load processed video details', 'error');
        }
    });
}

function showProcessedVideoDetails(data) {
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6>Basic Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>Created:</strong></td><td>${new Date(data.createdAt).toLocaleString()}</td></tr>
                    <tr><td><strong>Updated:</strong></td><td>${new Date(data.updatedAt).toLocaleString()}</td></tr>
                    <tr><td><strong>Video Type:</strong></td><td><span class="badge bg-info">${data.videoType.replace('_', ' ')}</span></td></tr>
                    <tr><td><strong>Video ID:</strong></td><td><code>${data.videoId}</code></td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>Content Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>Zodiac Sign:</strong></td><td>${data.zodiacSign || 'N/A'}</td></tr>
                    <tr><td><strong>Week Range:</strong></td><td>${data.weekRange || 'N/A'}</td></tr>
                </table>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-12">
                <h6>Video Title</h6>
                <div class="alert alert-light">
                    <p class="mb-0">${data.videoTitle}</p>
                </div>
                ${data.finalDescription ? `
                    <h6>Final Description</h6>
                    <div class="alert alert-secondary">
                        <pre class="mb-0" style="white-space: pre-wrap; font-size: 0.85rem;">${data.finalDescription}</pre>
                    </div>
                ` : ''}
                ${data.timestamps ? `
                    <h6>Timestamps</h6>
                    <div class="alert alert-info">
                        <pre class="mb-0" style="white-space: pre-wrap; font-size: 0.85rem;">${data.timestamps}</pre>
                    </div>
                ` : ''}
                ${data.pinnedComment ? `
                    <h6>Pinned Comment</h6>
                    <div class="alert alert-success">
                        <p class="mb-0">${data.pinnedComment}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    $('#processedVideoDetails').html(detailsHtml);
    $('#viewProcessedVideoBtn').attr('href', `https://youtube.com/watch?v=${data.videoId}`);
    $('#processedVideoModal').modal('show');
}

// Superfan Functions
function viewSuperfan(memberId) {
    $.ajax({
        url: `/admin/superfan/${memberId}`,
        headers: { 'X-API-Key': apiKey },
        success: function(data) {
            showSuperfanDetails(data);
        },
        error: function(xhr, status, error) {
            console.error('Error fetching superfan:', error);
            showNotification('Failed to load superfan details', 'error');
        }
    });
}

function viewSuperfanComments(channelId) {
    $.ajax({
        url: `/admin/superfan-comments/${channelId}`,
        headers: { 'X-API-Key': apiKey },
        success: function(data) {
            showSuperfanComments(data);
        },
        error: function(xhr, status, error) {
            console.error('Error fetching superfan comments:', error);
            showNotification('Failed to load superfan comments', 'error');
        }
    });
}

function showSuperfanDetails(data) {
    const detailsHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6>Basic Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>Display Name:</strong></td><td>${data.displayName}</td></tr>
                    <tr><td><strong>Channel ID:</strong></td><td><code>${data.channelId}</code></td></tr>
                    <tr><td><strong>Member Since:</strong></td><td>${new Date(data.memberSince).toLocaleDateString()}</td></tr>
                    <tr><td><strong>Status:</strong></td><td>${data.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-secondary">Inactive</span>'}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>Engagement Metrics</h6>
                <table class="table table-sm">
                    <tr><td><strong>Superfan Score:</strong></td><td><span class="badge bg-success">${data.superfanScore || 0}</span></td></tr>
                    <tr><td><strong>Membership Level:</strong></td><td><span class="badge bg-primary">${data.membershipLevel || 'none'}</span></td></tr>
                    <tr><td><strong>Total Comments:</strong></td><td>${data.totalComments || 0}</td></tr>
                    <tr><td><strong>Last Comment:</strong></td><td>${data.lastCommentAt ? new Date(data.lastCommentAt).toLocaleString() : 'Never'}</td></tr>
                </table>
            </div>
        </div>
        <div class="row mt-3">
            <div class="col-md-6">
                <h6>Keyword Mentions</h6>
                <table class="table table-sm">
                    <tr><td><strong>Milestone:</strong></td><td>${data.keywordMentions?.milestone || 0}</td></tr>
                    <tr><td><strong>Ruby:</strong></td><td>${data.keywordMentions?.ruby || 0}</td></tr>
                    <tr><td><strong>Positive:</strong></td><td>${data.keywordMentions?.positive || 0}</td></tr>
                    <tr><td><strong>Negative:</strong></td><td>${data.keywordMentions?.negative || 0}</td></tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>Sentiment Analysis</h6>
                <table class="table table-sm">
                    <tr><td><strong>Average Sentiment:</strong></td><td>${data.averageSentiment || 0}</td></tr>
                    <tr><td><strong>Positive Comments:</strong></td><td>${data.positiveCommentCount || 0}</td></tr>
                    <tr><td><strong>Negative Comments:</strong></td><td>${data.negativeCommentCount || 0}</td></tr>
                    <tr><td><strong>Engagement Score:</strong></td><td>${data.engagementScore || 0}</td></tr>
                </table>
            </div>
        </div>
        ${data.adminNotes ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Admin Notes</h6>
                    <div class="alert alert-info">
                        <p class="mb-0">${data.adminNotes}</p>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
    
    $('#superfanDetails').html(detailsHtml);
    $('#superfanModal').modal('show');
}

function showSuperfanComments(data) {
    const commentsHtml = data.comments.map(comment => `
        <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <small class="text-muted">${new Date(comment.publishedAt).toLocaleString()}</small>
                <span class="badge ${comment.sentiment?.label === 'positive' ? 'bg-success' : comment.sentiment?.label === 'negative' ? 'bg-danger' : 'bg-secondary'}">
                    ${comment.sentiment?.label || 'neutral'}
                </span>
            </div>
            <div class="card-body">
                <p class="card-text">${comment.textDisplay}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">Video: ${comment.videoTitle}</small>
                    <small class="text-muted">Likes: ${comment.likeCount || 0}</small>
                </div>
            </div>
        </div>
    `).join('');
    
    $('#superfanComments').html(commentsHtml);
    $('#superfanCommentsModal').modal('show');
}

 