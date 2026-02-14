/*
  SCRIPT.JS - Todo Dashboard with Kanban Board and Tags

  Features:
  - 4 Kanban columns: Not Started, In Progress, Waiting on Other Team(s), Completed
  - Drag and drop between columns
  - Tag system for categorizing tasks
  - Due dates with overdue highlighting
  - Priority levels (High / Medium / Low)
  - Search bar
  - Tag task counts
  - Timestamps (created / updated)
  - Notes / comments
  - Subtasks / checklists
  - Archive completed tasks
*/

document.addEventListener('DOMContentLoaded', function() {

    // ============ STATE ============
    let tasks = [];
    let tags = [];
    let currentEditingTaskId = null;
    let draggedTaskId = null;
    let selectedFilterTags = []; // Empty array means "All", otherwise array of tag IDs
    let filterDropdownOpen = false;
    let searchQuery = '';
    let showArchived = false;
    let editingSubtasks = [];
    let db = null;

    // ============ DOM REFERENCES ============
    const taskInput = document.getElementById('taskInput');
    const taskDescription = document.getElementById('taskDescription');
    const addButton = document.getElementById('addButton');
    const manageTagsBtn = document.getElementById('manageTagsBtn');
    const taskCount = document.getElementById('taskCount');

    // Kanban columns
    const columns = {
        'not-started': document.getElementById('not-started-tasks'),
        'in-progress': document.getElementById('in-progress-tasks'),
        'at-risk': document.getElementById('at-risk-tasks'),
        'completed': document.getElementById('completed-tasks')
    };

    // Modals
    const tagModal = document.getElementById('tagModal');
    const taskViewModal = document.getElementById('taskViewModal');
    const taskEditModal = document.getElementById('taskEditModal');

    // ============ INITIALIZATION ============
    init();

    function init() {
        loadData();
        migrateData();
        renderFilterTags();
        setupFilterDropdown();
        renderBoard();
        setupEventListeners();
        setupDragAndDrop();
    }

    // ============ DATA MANAGEMENT ============

    function loadData() {
        // Load from localStorage as instant cache
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tags = JSON.parse(localStorage.getItem('tags')) || [];

        // Set up Firebase real-time sync if available
        if (typeof firebase !== 'undefined' && firebase.database) {
            db = firebase.database();

            db.ref('tasks').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data === null && tasks.length > 0) {
                    // First time setup: push existing local data to Firebase
                    db.ref('tasks').set(tasks);
                    return;
                }
                tasks = normalizeTasks(data || []);
                localStorage.setItem('tasks', JSON.stringify(tasks));
                renderFilterTags();
                renderBoard();
            });

            db.ref('tags').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data === null && tags.length > 0) {
                    // First time setup: push existing local tags to Firebase
                    db.ref('tags').set(tags);
                    return;
                }
                tags = data || [];
                localStorage.setItem('tags', JSON.stringify(tags));
                renderFilterTags();
                renderBoard();
            });
        }
    }

    function normalizeTasks(taskArray) {
        return taskArray.map(task => ({
            id: task.id,
            text: task.text || '',
            description: task.description || '',
            completed: task.completed || false,
            status: task.status || 'not-started',
            tags: task.tags || [],
            dueDate: task.dueDate || null,
            priority: task.priority || 'medium',
            createdAt: task.createdAt || task.id,
            updatedAt: task.updatedAt || task.id,
            notes: task.notes || [],
            subtasks: task.subtasks || [],
            archived: task.archived || false
        }));
    }

    function migrateData() {
        let needsMigration = false;

        tasks = tasks.map(task => {
            if (task.status === undefined) {
                needsMigration = true;
                return {
                    ...task,
                    status: task.completed ? 'completed' : 'not-started',
                    tags: task.tags || [],
                    description: task.description || ''
                };
            }
            if (!task.tags) {
                needsMigration = true;
                task.tags = [];
            }
            if (task.description === undefined) {
                needsMigration = true;
                task.description = '';
            }
            if (task.dueDate === undefined) {
                needsMigration = true;
                task.dueDate = null;
            }
            if (task.priority === undefined) {
                needsMigration = true;
                task.priority = 'medium';
            }
            if (task.createdAt === undefined) {
                needsMigration = true;
                task.createdAt = task.id;
            }
            if (task.updatedAt === undefined) {
                needsMigration = true;
                task.updatedAt = task.id;
            }
            if (task.notes === undefined) {
                needsMigration = true;
                task.notes = [];
            }
            if (task.subtasks === undefined) {
                needsMigration = true;
                task.subtasks = [];
            }
            if (task.archived === undefined) {
                needsMigration = true;
                task.archived = false;
            }
            return task;
        });

        if (needsMigration) {
            saveTasks();
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        if (db) {
            db.ref('tasks').set(tasks);
        }
    }

    function saveTags() {
        localStorage.setItem('tags', JSON.stringify(tags));
        if (db) {
            db.ref('tags').set(tags);
        }
    }

    // ============ HELPERS ============

    function formatTimestamp(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatDueDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function isOverdue(task) {
        if (!task.dueDate || task.status === 'completed') return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(task.dueDate + 'T00:00:00') < today;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============ TASK CRUD ============

    function addTask() {
        const text = taskInput.value.trim();
        if (text === '') return;

        const description = taskDescription ? taskDescription.value.trim() : '';

        const task = {
            id: Date.now(),
            text: text,
            description: description,
            completed: false,
            status: 'not-started',
            tags: [],
            dueDate: null,
            priority: 'medium',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            notes: [],
            subtasks: [],
            archived: false
        };

        tasks.push(task);
        saveTasks();
        renderBoard();
        renderFilterTags();

        taskInput.value = '';
        if (taskDescription) taskDescription.value = '';
        taskInput.focus();
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderBoard();
        renderFilterTags();
    }

    function updateTaskStatus(taskId, newStatus) {
        tasks = tasks.map(task => {
            if (task.id === taskId) {
                task.status = newStatus;
                task.completed = (newStatus === 'completed');
                task.updatedAt = Date.now();
            }
            return task;
        });
        saveTasks();
        renderBoard();
    }

    function updateTaskTags(taskId, tagIds) {
        tasks = tasks.map(task => {
            if (task.id === taskId) {
                task.tags = tagIds;
            }
            return task;
        });
        saveTasks();
        renderBoard();
    }

    // ============ TAG CRUD ============

    function addTag(name, color) {
        if (name.trim() === '') return;

        const tag = {
            id: Date.now(),
            name: name.trim(),
            color: color
        };

        tags.push(tag);
        saveTags();
        renderTagList();
        renderFilterTags();
    }

    function deleteTag(tagId) {
        tags = tags.filter(tag => tag.id !== tagId);
        saveTags();

        // Remove tag from all tasks that have it
        tasks = tasks.map(task => ({
            ...task,
            tags: task.tags.filter(id => id !== tagId)
        }));
        saveTasks();

        // Remove deleted tag from filter if active
        selectedFilterTags = selectedFilterTags.filter(id => id !== tagId);

        renderTagList();
        renderFilterTags();
        renderBoard();
    }

    function getTagById(tagId) {
        return tags.find(tag => tag.id === tagId);
    }

    // ============ RENDERING ============

    function renderBoard() {
        // Clear all columns
        Object.values(columns).forEach(col => {
            if (col) col.innerHTML = '';
        });

        let filteredTasks = tasks.slice();

        // Filter out archived tasks unless toggle is on
        if (!showArchived) {
            filteredTasks = filteredTasks.filter(task => !task.archived);
        }

        // Filter by selected tags
        if (selectedFilterTags.length > 0) {
            filteredTasks = filteredTasks.filter(task => task.tags && selectedFilterTags.some(tagId => task.tags.includes(tagId)));
        }

        // Filter by search query
        if (searchQuery) {
            filteredTasks = filteredTasks.filter(task =>
                task.text.toLowerCase().includes(searchQuery) ||
                (task.description && task.description.toLowerCase().includes(searchQuery))
            );
        }

        // Group tasks by status
        const tasksByStatus = {
            'not-started': [],
            'in-progress': [],
            'at-risk': [],
            'completed': []
        };

        filteredTasks.forEach(task => {
            if (tasksByStatus[task.status]) {
                tasksByStatus[task.status].push(task);
            }
        });

        // Priority sort order
        const priorityOrder = { high: 0, medium: 1, low: 2 };

        // Render tasks in each column
        Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
            // Sort by priority within each column
            statusTasks.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));

            statusTasks.forEach(task => {
                const card = createTaskCard(task);
                if (columns[status]) {
                    columns[status].appendChild(card);
                }
            });

            // Update column count
            const column = document.querySelector(`[data-status="${status}"]`);
            if (column) {
                const countEl = column.querySelector('.column-count');
                if (countEl) {
                    countEl.textContent = statusTasks.length;
                }
            }
        });

        updateStats();
    }

    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        if (task.archived) card.classList.add('archived');
        if (isOverdue(task)) card.classList.add('overdue');
        card.draggable = true;
        card.dataset.taskId = task.id;

        // Build tags HTML and get first tag color for border
        let tagsHtml = '';
        let firstTagColor = null;
        if (task.tags && task.tags.length > 0) {
            tagsHtml = '<div class="task-tags">';
            task.tags.forEach((tagId, index) => {
                const tag = getTagById(tagId);
                if (tag) {
                    if (index === 0) firstTagColor = tag.color;
                    tagsHtml += `<span class="tag" style="background-color: ${tag.color}">${escapeHtml(tag.name)}</span>`;
                }
            });
            // Priority badge inline with tags (high only)
            if (task.priority === 'high') {
                tagsHtml += '<span class="task-priority high">HIGH</span>';
            }
            tagsHtml += '</div>';
        } else if (task.priority === 'high') {
            tagsHtml = '<div class="task-tags"><span class="task-priority high">HIGH</span></div>';
        }

        // Apply left border color based on first tag
        if (firstTagColor) {
            card.style.borderLeft = `4px solid ${firstTagColor}`;
        }

        const descriptionHtml = task.description
            ? `<p class="task-description">${escapeHtml(task.description)}</p>`
            : '';

        // Build metadata row
        let metaItems = [];
        if (task.dueDate) {
            const overdueClass = isOverdue(task) ? ' overdue' : '';
            metaItems.push(`<span class="task-meta-item${overdueClass}">${formatDueDate(task.dueDate)}</span>`);
        }
        if (task.subtasks && task.subtasks.length > 0) {
            const done = task.subtasks.filter(s => s.completed).length;
            metaItems.push(`<span class="task-meta-item">${done}/${task.subtasks.length} subtasks</span>`);
        }
        if (task.notes && task.notes.length > 0) {
            metaItems.push(`<span class="task-meta-item">${task.notes.length} note${task.notes.length !== 1 ? 's' : ''}</span>`);
        }
        const metaHtml = metaItems.length > 0
            ? `<div class="task-card-meta">${metaItems.join('')}</div>`
            : '';

        card.innerHTML = `
            ${tagsHtml}
            <span class="task-text">${escapeHtml(task.text)}</span>
            ${descriptionHtml}
            ${metaHtml}
            <div class="task-actions">
                <button class="edit-btn" title="Edit task">&#9998;</button>
                <button class="delete-btn" title="Delete">&times;</button>
            </div>
        `;

        // Click on card to view details
        card.addEventListener('click', () => {
            openTaskViewModal(task.id);
        });

        // Add event listeners
        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openTaskEditModal(task.id);
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        return card;
    }

    function renderTagList() {
        const tagList = document.getElementById('tagList');
        if (!tagList) return;

        tagList.innerHTML = '';

        tags.forEach(tag => {
            const count = tasks.filter(t => t.tags && t.tags.includes(tag.id)).length;
            const li = document.createElement('li');
            li.className = 'tag-list-item';
            li.innerHTML = `
                <div class="tag-preview">
                    <span class="tag-color-swatch" style="background-color: ${tag.color}"></span>
                    <span>${escapeHtml(tag.name)}</span>
                    <span class="tag-task-count">${count} task${count !== 1 ? 's' : ''}</span>
                </div>
                <button class="delete-tag-btn" data-tag-id="${tag.id}">&times;</button>
            `;

            li.querySelector('.delete-tag-btn').addEventListener('click', () => {
                deleteTag(tag.id);
            });

            tagList.appendChild(li);
        });
    }

    function renderFilterTags() {
        const menu = document.getElementById('filterDropdownMenu');
        const displayText = document.getElementById('filterDisplayText');
        if (!menu || !displayText) return;

        menu.innerHTML = '';

        // Add "All" option
        const allOption = document.createElement('label');
        allOption.className = 'filter-option' + (selectedFilterTags.length === 0 ? ' selected' : '');
        allOption.innerHTML = `
            <input type="checkbox" value="all" ${selectedFilterTags.length === 0 ? 'checked' : ''}>
            <span class="filter-option-label">All Tasks</span>
        `;
        allOption.querySelector('input').addEventListener('change', () => {
            selectedFilterTags = [];
            renderFilterTags();
            renderBoard();
        });
        menu.appendChild(allOption);

        // Add option for each tag
        tags.forEach(tag => {
            const isSelected = selectedFilterTags.includes(tag.id);
            const count = tasks.filter(t => t.tags && t.tags.includes(tag.id)).length;
            const option = document.createElement('label');
            option.className = 'filter-option' + (isSelected ? ' selected' : '');
            option.innerHTML = `
                <input type="checkbox" value="${tag.id}" ${isSelected ? 'checked' : ''}>
                <span class="filter-option-color" style="background-color: ${tag.color}"></span>
                <span class="filter-option-label">${escapeHtml(tag.name)}</span>
                <span class="tag-count">(${count})</span>
            `;
            option.querySelector('input').addEventListener('change', (e) => {
                toggleFilterTag(tag.id, e.target.checked);
            });
            menu.appendChild(option);
        });

        // Update display text
        updateFilterDisplayText();
    }

    function toggleFilterTag(tagId, isSelected) {
        if (isSelected) {
            if (!selectedFilterTags.includes(tagId)) {
                selectedFilterTags.push(tagId);
            }
        } else {
            selectedFilterTags = selectedFilterTags.filter(id => id !== tagId);
        }
        renderFilterTags();
        renderBoard();
    }

    function updateFilterDisplayText() {
        const displayText = document.getElementById('filterDisplayText');
        if (!displayText) return;

        if (selectedFilterTags.length === 0) {
            displayText.textContent = 'All Tasks';
        } else if (selectedFilterTags.length === 1) {
            const tag = getTagById(selectedFilterTags[0]);
            displayText.textContent = tag ? tag.name : 'All Tasks';
        } else {
            displayText.textContent = `${selectedFilterTags.length} tags selected`;
        }
    }

    function setupFilterDropdown() {
        const btn = document.getElementById('filterDropdownBtn');
        const menu = document.getElementById('filterDropdownMenu');
        if (!btn || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterDropdownOpen = !filterDropdownOpen;
            btn.classList.toggle('open', filterDropdownOpen);
            menu.classList.toggle('open', filterDropdownOpen);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-dropdown-container')) {
                filterDropdownOpen = false;
                btn.classList.remove('open');
                menu.classList.remove('open');
            }
        });
    }

    function updateStats() {
        const nonArchived = tasks.filter(t => !t.archived);
        const total = nonArchived.length;
        const completed = nonArchived.filter(t => t.status === 'completed').length;
        const atRisk = nonArchived.filter(t => t.status === 'at-risk').length;
        const archived = tasks.filter(t => t.archived).length;

        let statsText = `${total} total tasks`;
        if (completed > 0) statsText += ` | ${completed} completed`;
        if (atRisk > 0) statsText += ` | ${atRisk} waiting`;
        if (archived > 0) statsText += ` | ${archived} archived`;

        if (taskCount) {
            taskCount.textContent = statsText;
        }
    }

    // ============ ARCHIVE ============

    function archiveCompletedTasks() {
        let changed = false;
        tasks = tasks.map(task => {
            if (task.status === 'completed' && !task.archived) {
                task.archived = true;
                task.updatedAt = Date.now();
                changed = true;
            }
            return task;
        });
        if (changed) {
            saveTasks();
            renderBoard();
        }
    }

    // ============ SUBTASK HELPERS ============

    function renderEditSubtasks() {
        const list = document.getElementById('editSubtaskList');
        if (!list) return;
        list.innerHTML = '';
        editingSubtasks.forEach(sub => {
            const li = document.createElement('li');
            li.className = 'edit-subtask-item';
            li.innerHTML = `
                <span>${escapeHtml(sub.text)}</span>
                <button class="delete-subtask-btn" data-sub-id="${sub.id}">&times;</button>
            `;
            li.querySelector('.delete-subtask-btn').addEventListener('click', () => {
                editingSubtasks = editingSubtasks.filter(s => s.id !== sub.id);
                renderEditSubtasks();
            });
            list.appendChild(li);
        });
    }

    // ============ DRAG AND DROP ============

    function setupDragAndDrop() {
        // Add drag events to each column's task container
        Object.values(columns).forEach(column => {
            if (!column) return;
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('dragenter', handleDragEnter);
            column.addEventListener('dragleave', handleDragLeave);
            column.addEventListener('drop', handleDrop);
        });

        // Delegate drag start/end to document for dynamically created cards
        document.addEventListener('dragstart', handleDragStart);
        document.addEventListener('dragend', handleDragEnd);
    }

    function handleDragStart(e) {
        const card = e.target.closest('.task-card');
        if (!card) return;

        draggedTaskId = parseInt(card.dataset.taskId);
        card.classList.add('dragging');

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedTaskId);
    }

    function handleDragEnd(e) {
        const card = e.target.closest('.task-card');
        if (card) {
            card.classList.remove('dragging');
        }

        // Remove all drag-over states
        document.querySelectorAll('.column-tasks').forEach(col => {
            col.classList.remove('drag-over');
        });

        draggedTaskId = null;
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        const column = e.target.closest('.column-tasks');
        if (column) {
            column.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        const column = e.target.closest('.column-tasks');
        if (column && !column.contains(e.relatedTarget)) {
            column.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();

        const column = e.target.closest('.column-tasks');
        if (!column || !draggedTaskId) return;

        column.classList.remove('drag-over');

        // Get the status from the parent kanban-column's data attribute
        const kanbanColumn = column.closest('.kanban-column');
        const newStatus = kanbanColumn.dataset.status;

        updateTaskStatus(draggedTaskId, newStatus);
    }

    // ============ EVENT LISTENERS ============

    function setupEventListeners() {
        // Add task
        if (addButton) {
            addButton.addEventListener('click', addTask);
        }
        if (taskInput) {
            taskInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') addTask();
            });
        }

        // Open tag management modal
        if (manageTagsBtn) {
            manageTagsBtn.addEventListener('click', openTagModal);
        }

        // Close modals when clicking X
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAllModals();
            });
        });

        // Add tag button
        const addTagBtn = document.getElementById('addTagBtn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => {
                const nameInput = document.getElementById('tagNameInput');
                const colorInput = document.getElementById('tagColorInput');
                addTag(nameInput.value, colorInput.value);
                nameInput.value = '';
            });
        }

        // Save task button
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        if (saveTaskBtn) {
            saveTaskBtn.addEventListener('click', saveTaskFromModal);
        }

        // Edit from view modal button
        const editFromViewBtn = document.getElementById('editFromViewBtn');
        if (editFromViewBtn) {
            editFromViewBtn.addEventListener('click', () => {
                if (taskViewModal) taskViewModal.classList.add('hidden');
                openTaskEditModal(currentEditingTaskId);
            });
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim().toLowerCase();
                renderBoard();
            });
        }

        // Archive completed button
        const archiveCompletedBtn = document.getElementById('archiveCompletedBtn');
        if (archiveCompletedBtn) {
            archiveCompletedBtn.addEventListener('click', archiveCompletedTasks);
        }

        // Show archived toggle
        const showArchivedToggle = document.getElementById('showArchivedToggle');
        if (showArchivedToggle) {
            showArchivedToggle.addEventListener('change', (e) => {
                showArchived = e.target.checked;
                renderBoard();
            });
        }
    }

    // ============ MODAL MANAGEMENT ============

    function openTagModal() {
        renderTagList();
        if (tagModal) {
            tagModal.classList.remove('hidden');
        }
    }

    function openTaskViewModal(taskId) {
        currentEditingTaskId = taskId;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Populate title
        const viewTitle = document.getElementById('viewTaskTitle');
        if (viewTitle) {
            viewTitle.textContent = task.text;
        }

        // Populate description
        const viewDescription = document.getElementById('viewTaskDescription');
        if (viewDescription) {
            viewDescription.textContent = task.description || 'No description provided.';
            viewDescription.classList.toggle('no-description', !task.description);
        }

        // Populate tags
        const viewTags = document.getElementById('viewTaskTags');
        if (viewTags) {
            viewTags.innerHTML = '';
            if (task.tags && task.tags.length > 0) {
                task.tags.forEach(tagId => {
                    const tag = getTagById(tagId);
                    if (tag) {
                        const tagEl = document.createElement('span');
                        tagEl.className = 'tag';
                        tagEl.style.backgroundColor = tag.color;
                        tagEl.textContent = tag.name;
                        viewTags.appendChild(tagEl);
                    }
                });
            }
        }

        // Populate priority badge
        const viewPriority = document.getElementById('viewTaskPriority');
        if (viewPriority) {
            viewPriority.className = 'view-task-priority ' + (task.priority || 'medium');
            viewPriority.textContent = (task.priority || 'medium').charAt(0).toUpperCase() + (task.priority || 'medium').slice(1) + ' Priority';
        }

        // Populate due date
        const viewDueDate = document.getElementById('viewTaskDueDate');
        if (viewDueDate) {
            if (task.dueDate) {
                viewDueDate.textContent = 'Due: ' + formatDueDate(task.dueDate);
                viewDueDate.className = 'view-task-due-date' + (isOverdue(task) ? ' overdue' : '');
                viewDueDate.style.display = 'inline-block';
            } else {
                viewDueDate.style.display = 'none';
            }
        }

        // Populate subtasks
        const viewSubtasks = document.getElementById('viewSubtasks');
        if (viewSubtasks) {
            viewSubtasks.innerHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                const heading = document.createElement('h4');
                heading.textContent = `Subtasks (${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length})`;
                viewSubtasks.appendChild(heading);

                task.subtasks.forEach(sub => {
                    const item = document.createElement('label');
                    item.className = 'subtask-item' + (sub.completed ? ' completed' : '');
                    item.innerHTML = `
                        <input type="checkbox" ${sub.completed ? 'checked' : ''}>
                        <span>${escapeHtml(sub.text)}</span>
                    `;
                    item.querySelector('input').addEventListener('change', (e) => {
                        e.stopPropagation();
                        sub.completed = e.target.checked;
                        task.updatedAt = Date.now();
                        saveTasks();
                        heading.textContent = `Subtasks (${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length})`;
                        item.classList.toggle('completed', sub.completed);
                        renderBoard();
                    });
                    viewSubtasks.appendChild(item);
                });
            }
        }

        // Populate notes
        const viewNotes = document.getElementById('viewNotes');
        if (viewNotes) {
            viewNotes.innerHTML = '';
            if (task.notes && task.notes.length > 0) {
                const heading = document.createElement('h4');
                heading.textContent = `Notes (${task.notes.length})`;
                viewNotes.appendChild(heading);

                [...task.notes].reverse().forEach(note => {
                    const noteEl = document.createElement('div');
                    noteEl.className = 'note-item';
                    noteEl.innerHTML = `
                        <p class="note-text">${escapeHtml(note.text)}</p>
                        <span class="note-date">${formatTimestamp(note.createdAt)}</span>
                        <button class="delete-note-btn" data-note-id="${note.id}">&times;</button>
                    `;
                    noteEl.querySelector('.delete-note-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        task.notes = task.notes.filter(n => n.id !== note.id);
                        task.updatedAt = Date.now();
                        saveTasks();
                        openTaskViewModal(task.id);
                        renderBoard();
                    });
                    viewNotes.appendChild(noteEl);
                });
            }
        }

        // Wire add note button
        const newNoteInput = document.getElementById('newNoteInput');
        const addNoteBtn = document.getElementById('addNoteBtn');
        if (addNoteBtn && newNoteInput) {
            newNoteInput.value = '';
            addNoteBtn.onclick = () => {
                const text = newNoteInput.value.trim();
                if (!text) return;
                if (!task.notes) task.notes = [];
                task.notes.push({ id: Date.now(), text, createdAt: Date.now() });
                task.updatedAt = Date.now();
                saveTasks();
                newNoteInput.value = '';
                openTaskViewModal(task.id);
                renderBoard();
            };
        }

        // Populate timestamps
        const viewMeta = document.getElementById('viewTaskMeta');
        if (viewMeta) {
            viewMeta.innerHTML = `
                <span>Created: ${formatTimestamp(task.createdAt)}</span>
                <span>Last updated: ${formatTimestamp(task.updatedAt)}</span>
            `;
        }

        // Archive / Unarchive button
        const archiveBtn = document.getElementById('viewArchiveBtn');
        if (archiveBtn) {
            if (task.archived) {
                archiveBtn.textContent = 'Unarchive';
                archiveBtn.style.display = 'inline-block';
                archiveBtn.onclick = () => {
                    task.archived = false;
                    task.updatedAt = Date.now();
                    saveTasks();
                    renderBoard();
                    closeAllModals();
                };
            } else if (task.status === 'completed') {
                archiveBtn.textContent = 'Archive';
                archiveBtn.style.display = 'inline-block';
                archiveBtn.onclick = () => {
                    task.archived = true;
                    task.updatedAt = Date.now();
                    saveTasks();
                    renderBoard();
                    closeAllModals();
                };
            } else {
                archiveBtn.style.display = 'none';
            }
        }

        if (taskViewModal) {
            taskViewModal.classList.remove('hidden');
        }
    }

    function openTaskEditModal(taskId) {
        currentEditingTaskId = taskId;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const editTaskText = document.getElementById('editTaskText');
        if (editTaskText) {
            editTaskText.textContent = task.text;
        }

        // Populate description field
        const editDescription = document.getElementById('editTaskDescription');
        if (editDescription) {
            editDescription.value = task.description || '';
        }

        // Populate due date
        const editDueDate = document.getElementById('editDueDate');
        if (editDueDate) {
            editDueDate.value = task.dueDate || '';
        }

        // Populate priority
        const priorityRadios = document.querySelectorAll('input[name="priority"]');
        priorityRadios.forEach(radio => {
            radio.checked = (radio.value === (task.priority || 'medium'));
        });

        // Populate subtasks
        editingSubtasks = JSON.parse(JSON.stringify(task.subtasks || []));
        renderEditSubtasks();

        // Wire subtask add button
        const subtaskInput = document.getElementById('subtaskInput');
        const addSubtaskBtn = document.getElementById('addSubtaskBtn');
        if (addSubtaskBtn && subtaskInput) {
            subtaskInput.value = '';
            addSubtaskBtn.onclick = () => {
                const text = subtaskInput.value.trim();
                if (!text) return;
                editingSubtasks.push({ id: Date.now(), text, completed: false });
                subtaskInput.value = '';
                renderEditSubtasks();
            };
            subtaskInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubtaskBtn.click();
                }
            };
        }

        // Render tag checkboxes
        const container = document.getElementById('tagCheckboxes');
        if (!container) return;

        container.innerHTML = '';

        if (tags.length === 0) {
            container.innerHTML = '<p class="no-tags-message">No tags created yet. Create tags in the "Manage Tags" modal.</p>';
        } else {
            tags.forEach(tag => {
                const isChecked = task.tags.includes(tag.id);
                const label = document.createElement('label');
                label.className = 'tag-checkbox-label';
                label.style.backgroundColor = tag.color;
                label.innerHTML = `
                    <input type="checkbox" value="${tag.id}" ${isChecked ? 'checked' : ''}>
                    <span>${escapeHtml(tag.name)}</span>
                `;
                container.appendChild(label);
            });
        }

        if (taskEditModal) {
            taskEditModal.classList.remove('hidden');
        }
    }

    function saveTaskFromModal() {
        if (!currentEditingTaskId) return;

        const checkboxes = document.querySelectorAll('#tagCheckboxes input[type="checkbox"]:checked');
        const selectedTagIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

        const editDescription = document.getElementById('editTaskDescription');
        const newDescription = editDescription ? editDescription.value.trim() : '';

        const editDueDate = document.getElementById('editDueDate');
        const newDueDate = editDueDate && editDueDate.value ? editDueDate.value : null;

        const selectedPriority = document.querySelector('input[name="priority"]:checked');
        const newPriority = selectedPriority ? selectedPriority.value : 'medium';

        // Update task
        tasks = tasks.map(task => {
            if (task.id === currentEditingTaskId) {
                task.tags = selectedTagIds;
                task.description = newDescription;
                task.dueDate = newDueDate;
                task.priority = newPriority;
                task.subtasks = editingSubtasks;
                task.updatedAt = Date.now();
            }
            return task;
        });
        saveTasks();
        renderBoard();
        renderFilterTags();

        closeAllModals();
    }

    function closeAllModals() {
        if (tagModal) tagModal.classList.add('hidden');
        if (taskViewModal) taskViewModal.classList.add('hidden');
        if (taskEditModal) taskEditModal.classList.add('hidden');
        currentEditingTaskId = null;
    }

});
