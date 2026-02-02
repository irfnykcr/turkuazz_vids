const loggerCategoryEdit = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[CATEGORY-EDIT] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[CATEGORY-EDIT] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[CATEGORY-EDIT] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[CATEGORY-EDIT] [${timestamp}] [DEBUG]`, ...args)
	}
}

document.addEventListener('DOMContentLoaded', async function() {
    let allCategories = {}
    let flatCategories = []
    let categoryTree = {}
    let expandedCategories = new Set()

    const loadingState = document.getElementById('loadingState')
    const categoryManagement = document.getElementById('categoryManagement')
    const categoryTreeEl = document.getElementById('categoryTree')
    const parentCategorySelect = document.getElementById('parentCategory')
    const createCategoryForm = document.getElementById('createCategoryForm')
    const createCategoryBtn = document.getElementById('createCategoryBtn')
    const createCategoryStatus = document.getElementById('createCategoryStatus')
    const totalCategoriesEl = document.getElementById('totalCategories')
    const rootCategoriesEl = document.getElementById('rootCategories')
    const maxDepthEl = document.getElementById('maxDepth')

    const getEnvVars = async () => {
        if (!localStorage.getItem("envVars")) {
            loggerCategoryEdit.info("waiting for envVars")
            await new Promise(resolve => setTimeout(resolve, 750))
            return getEnvVars()
        }
        return JSON.parse(localStorage.getItem("envVars"))
    }

    const envVars = await getEnvVars()
    window.API_URL = envVars.API_URL
    window.API_KEY = envVars.API_KEY
    window.CDN_URL = envVars.CDN_URL

    async function loadCategories() {
        if (!localStorage.getItem("all_categories")) {
            loggerCategoryEdit.info("waiting for all_categories")
            await new Promise(resolve => setTimeout(resolve, 750))
            return loadCategories()
        }
        allCategories = JSON.parse(localStorage.getItem("all_categories")) || {}
        flatCategories = flattenCategories(allCategories)
        loggerCategoryEdit.info('Loaded categories:', flatCategories.length, allCategories)
        return allCategories
    }

    function flattenCategories(categories, prefix = '') {
        let result = []
        
        Object.keys(categories).forEach(category => {
            const path = prefix ? `${prefix}/${category}/` : `${category}/`
            result.push(path)
            
            if (typeof categories[category] === 'object' && Object.keys(categories[category]).length > 0) {
                result = result.concat(flattenCategories(categories[category], path.slice(0, -1)))
            }
        })
        
        return result
    }

    function buildCategoryTree(categories, prefix = '', level = 0) {
        const tree = []
        
        Object.keys(categories).forEach(category => {
            const path = prefix ? `${prefix}/${category}/` : `${category}/`
            const hasChildren = typeof categories[category] === 'object' && Object.keys(categories[category]).length > 0
            
            const item = {
                name: category,
                path: path,
                level: level,
                hasChildren: hasChildren,
                children: hasChildren ? buildCategoryTree(categories[category], path.slice(0, -1), level + 1) : []
            }
            
            tree.push(item)
        })
        
        return tree
    }

    function renderCategoryTree(tree, container) {
        container.innerHTML = ''
        
        function renderTreeItem(item) {
            const div = document.createElement('div')
            div.className = `category-item`
            div.style.marginLeft = `${item.level * 20}px`
            
            const isExpanded = expandedCategories.has(item.path)
            
            div.innerHTML = `
                <div class="flex items-center justify-between w-full min-w-max">
                    <div class="flex items-center space-x-2 flex-shrink-0">
                        ${item.hasChildren ? 
                            `<button class="category-toggle text-turkuazz hover:text-white w-4 h-4 flex items-center justify-center flex-shrink-0" data-path="${item.path}">
                                ${isExpanded ? '−' : '+'}
                            </button>` : 
                            '<span class="w-4 flex-shrink-0"></span>'
                        }
                        <span class="text-white font-medium whitespace-nowrap">${item.name}</span>
                        <span class="text-gray-500 text-xs opacity-75 whitespace-nowrap">${item.path}</span>
                    </div>
                    <div class="text-gray-400 text-xs flex-shrink-0 ml-4">
                        Level ${item.level}
                    </div>
                </div>
            `
            
            container.appendChild(div)
            
            if (item.hasChildren && isExpanded) {
                item.children.forEach(child => renderTreeItem(child))
            }
        }
        
        tree.forEach(item => renderTreeItem(item))
        
        container.querySelectorAll('.category-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const path = e.target.dataset.path
                if (expandedCategories.has(path)) {
                    expandedCategories.delete(path)
                } else {
                    expandedCategories.add(path)
                }
                renderCategoryTree(categoryTree, categoryTreeEl)
            })
        })
    }

    function populateParentSelect() {
        parentCategorySelect.innerHTML = '<option value="/">Root (no parent)</option>'
        
        flatCategories.forEach(category => {
            const option = document.createElement('option')
            option.value = category.slice(0, -1)
            option.textContent = category
            parentCategorySelect.appendChild(option)
        })
    }

    function updateStatistics() {
        const totalCount = flatCategories.length
        const rootCount = Object.keys(allCategories).length
        const maxDepthCount = Math.max(...flatCategories.map(cat => (cat.match(/\//g) || []).length))
        
        totalCategoriesEl.textContent = totalCount
        rootCategoriesEl.textContent = rootCount
        maxDepthEl.textContent = maxDepthCount
    }

    async function createCategory(name, parent) {
        try {
            const response = await fetch(`${window.API_URL}/upload/create_category`, {
                method: 'POST',
                headers: {
                    'api-key': window.API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    parent: parent
                })
            })

            if (response.ok) {
                showStatus('Category created successfully!', 'success')
                localStorage.removeItem("all_categories")
                setTimeout(() => {
                    window.location.reload()
                }, 1000)
                return true
            } else {
                const errorText = await response.text()
                showStatus(`Error creating category: ${errorText}`, 'error')
                return false
            }
        } catch (error) {
            loggerCategoryEdit.error('Error creating category:', error)
            showStatus('Network error occurred while creating category', 'error')
            return false
        }
    }

    function showStatus(message, type) {
        createCategoryStatus.className = `mt-4 p-3 rounded ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`
        createCategoryStatus.textContent = message
        createCategoryStatus.classList.remove('hidden')
        
        setTimeout(() => {
            createCategoryStatus.classList.add('hidden')
        }, 5000)
    }

    function validateCategoryName(name) {
        if (name.length < 2 || name.length > 100) {
            return 'Category name must be between 2 and 100 characters'
        }
        
        const allowedChars = /^[0-9a-zA-ZıĞğÜüŞşİÖöÇç\-,._()!+\-\[\]{} ]+$/
        if (!allowedChars.test(name)) {
            return 'Category name contains invalid characters'
        }
        
        return null
    }

    createCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        
        const name = document.getElementById('categoryName').value.trim()
        const parent = document.getElementById('parentCategory').value
        
        const validation = validateCategoryName(name)
        if (validation) {
            showStatus(validation, 'error')
            return
        }
        
        createCategoryBtn.disabled = true
        createCategoryBtn.textContent = 'Creating...'
        
        const success = await createCategory(name, parent)
        
        createCategoryBtn.disabled = false
        createCategoryBtn.textContent = 'Create Category'
        
        if (success) {
            document.getElementById('categoryName').value = ''
            document.getElementById('parentCategory').value = '/'
        }
    })

    document.getElementById('expandAll').addEventListener('click', () => {
        flatCategories.forEach(cat => expandedCategories.add(cat))
        renderCategoryTree(categoryTree, categoryTreeEl)
    })

    document.getElementById('collapseAll').addEventListener('click', () => {
        expandedCategories.clear()
        renderCategoryTree(categoryTree, categoryTreeEl)
    })

    async function init() {
        try {
            loadingState.classList.remove('hidden')
            categoryManagement.classList.add('hidden')
            
            await loadCategories()
            
            categoryTree = buildCategoryTree(allCategories)
            
            renderCategoryTree(categoryTree, categoryTreeEl)
            populateParentSelect()
            updateStatistics()
            
            loadingState.classList.add('hidden')
            categoryManagement.classList.remove('hidden')
            
        } catch (error) {
            loggerCategoryEdit.error('Error initializing category management:', error)
            loadingState.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-400">Error loading categories</p>
                    <button onclick="window.location.reload()" class="mt-4 bg-turkuazz text-dark-bg px-4 py-2 rounded">
                        Retry
                    </button>
                </div>
            `
        }
    }

    init()
})