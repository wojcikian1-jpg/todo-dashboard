/*
  SCRIPT.JS - Controls BEHAVIOR (what happens when you click things)

  Think of it like this:
  - HTML = the bones (structure)
  - CSS = the skin (appearance)
  - JavaScript = the muscles (makes things move and respond)
*/

// Wait for the page to fully load before running our code
document.addEventListener('DOMContentLoaded', function() {

    // Grab references to elements we need to work with
    const taskInput = document.getElementById('taskInput');
    const addButton = document.getElementById('addButton');
    const taskList = document.getElementById('taskList');
    const taskCount = document.getElementById('taskCount');

    // Load any saved tasks from browser storage
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // Display existing tasks when page loads
    renderTasks();

    // When "Add Task" button is clicked
    addButton.addEventListener('click', addTask);

    // Also add task when Enter key is pressed
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });

    // FUNCTION: Add a new task
    function addTask() {
        const text = taskInput.value.trim();

        // Don't add empty tasks
        if (text === '') return;

        // Create a task object
        const task = {
            id: Date.now(),        // Unique ID based on timestamp
            text: text,
            completed: false
        };

        // Add to our list
        tasks.push(task);

        // Save and refresh display
        saveTasks();
        renderTasks();

        // Clear the input
        taskInput.value = '';
        taskInput.focus();
    }

    // FUNCTION: Toggle task complete/incomplete
    function toggleTask(id) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                task.completed = !task.completed;
            }
            return task;
        });
        saveTasks();
        renderTasks();
    }

    // FUNCTION: Delete a task
    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }

    // FUNCTION: Save tasks to browser storage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // FUNCTION: Display all tasks on the page
    function renderTasks() {
        // Clear current list
        taskList.innerHTML = '';

        // Create HTML for each task
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'task-item' + (task.completed ? ' completed' : '');

            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <button class="delete-btn">x</button>
            `;

            // Add click handlers
            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => toggleTask(task.id));

            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteTask(task.id));

            taskList.appendChild(li);
        });

        // Update the count
        const remaining = tasks.filter(t => !t.completed).length;
        const total = tasks.length;
        taskCount.textContent = `${remaining} of ${total} tasks remaining`;
    }
});
