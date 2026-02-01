/*
  SCRIPT.JS - Todo Dashboard with Kanban Board and Tags

  Features:
  - 4 Kanban columns: Not Started, In Progress, At Risk, Completed
  - Drag and drop between columns
  - Tag system for categorizing tasks
*/

document.addEventListener('DOMContentLoaded', function() {

    // ============ STATE ============
    let tasks = [];
    let tags = [];
    let currentEditingTaskId = null;
    let draggedTaskId = null;

    // ============ DOM REFERENCES ============
    const taskInput = document.getElementById('taskInput');
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
    const taskEditModal = document.getElementById('taskEditModal');

    // ============ INITIALIZATION ============
    init();

    function init() {
        loadData();
        migrateData();
        renderBoard();
        setupEventListeners();
        setupDragAndDrop();
    }

    // ============ DATA MANAGEMENT ============

    function loadData() {
        tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tags = JSON.parse(localStorage.getItem('tags')) || [];
    }

    function migrateData() {
        let needsMigration = false;

        tasks = tasks.map(task => {
            if (task.status === undefined) {
                needsMigration = true;
                return {
                    ...task,
                    status: task.completed ? 'completed' : 'not-started',
                    tags: task.tags || []
                };
            }
            if (!task.tags) {
                needsMigration = true;
                task.tags = [];
            }
            return task;
        });

        if (needsMigration) {
            saveTasks();
        }
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function saveTags() {
        localStorage.setItem('tags', JSON.stringify(tags));
    }

    // ============ TASK CRUD ============

    function addTask() {
        const text = taskInput.value.trim();
        if (text === '') return;

        const task = {
            id: Date.now(),
            text: text,
            completed: false,
            status: 'not-started',
            tags: []
        };

        tasks.push(task);
        saveTasks();
        renderBoard();

        taskInput.value = '';
        taskInput.focus();
    }

    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderBoard();
    }

    function updateTaskStatus(taskId, newStatus) {
        tasks = tasks.map(task => {
            if (task.id === taskId) {
                task.status = newStatus;
                task.completed = (newStatus === 'completed');
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

        renderTagList();
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

        // Group tasks by status
        const tasksByStatus = {
            'not-started': [],
            'in-progress': [],
            'at-risk': [],
            'completed': []
        };

        tasks.forEach(task => {
            if (tasksByStatus[task.status]) {
                tasksByStatus[task.status].push(task);
            }
        });

        // Render tasks in each column
        Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
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
        card.draggable = true;
        card.dataset.taskId = task.id;

        // Build tags HTML
        let tagsHtml = '';
        if (task.tags && task.tags.length > 0) {
            tagsHtml = '<div class="task-tags">';
            task.tags.forEach(tagId => {
                const tag = getTagById(tagId);
                if (tag) {
                    tagsHtml += `<span class="tag" style="background-color: ${tag.color}">${escapeHtml(tag.name)}</span>`;
                }
            });
            tagsHtml += '</div>';
        }

        card.innerHTML = `
            ${tagsHtml}
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-actions">
                <button class="edit-btn" title="Edit tags">&#9998;</button>
                <button class="delete-btn" title="Delete">&times;</button>
            </div>
        `;

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
            const li = document.createElement('li');
            li.className = 'tag-list-item';
            li.innerHTML = `
                <div class="tag-preview">
                    <span class="tag-color-swatch" style="background-color: ${tag.color}"></span>
                    <span>${escapeHtml(tag.name)}</span>
                </div>
                <button class="delete-tag-btn" data-tag-id="${tag.id}">&times;</button>
            `;

            li.querySelector('.delete-tag-btn').addEventListener('click', () => {
                deleteTag(tag.id);
            });

            tagList.appendChild(li);
        });
    }

    function updateStats() {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const atRisk = tasks.filter(t => t.status === 'at-risk').length;

        let statsText = `${total} total tasks`;
        if (completed > 0) statsText += ` | ${completed} completed`;
        if (atRisk > 0) statsText += ` | ${atRisk} at risk`;

        if (taskCount) {
            taskCount.textContent = statsText;
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

        // Save task tags button
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        if (saveTaskBtn) {
            saveTaskBtn.addEventListener('click', saveTaskTagsFromModal);
        }
    }

    // ============ MODAL MANAGEMENT ============

    function openTagModal() {
        renderTagList();
        if (tagModal) {
            tagModal.classList.remove('hidden');
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

    function saveTaskTagsFromModal() {
        if (!currentEditingTaskId) return;

        const checkboxes = document.querySelectorAll('#tagCheckboxes input[type="checkbox"]:checked');
        const selectedTagIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

        updateTaskTags(currentEditingTaskId, selectedTagIds);
        closeAllModals();
    }

    function closeAllModals() {
        if (tagModal) tagModal.classList.add('hidden');
        if (taskEditModal) taskEditModal.classList.add('hidden');
        currentEditingTaskId = null;
    }

});
