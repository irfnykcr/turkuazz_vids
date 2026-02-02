const loggerSidebar = {
	info: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[SIDEBAR] [${timestamp}] [INFO]`, ...args)
	},
	warn: (...args) => {
		const timestamp = new Date().toISOString()
		console.warn(`[SIDEBAR] [${timestamp}] [WARN]`, ...args)
	},
	error: (...args) => {
		const timestamp = new Date().toISOString()
		console.error(`[SIDEBAR] [${timestamp}] [ERROR]`, ...args)
	},
	debug: (...args) => {
		const timestamp = new Date().toISOString()
		console.log(`[SIDEBAR] [${timestamp}] [DEBUG]`, ...args)
	}
}
document.addEventListener('DOMContentLoaded', function() {

	const sidebarEl = document.querySelector("#sidebar")
	
	const makeSidebar = () => {
		sidebarEl.classList = "w-64 bg-dark-bg border-r border-gray-700 min-h-screen"
		sidebarEl.innerHTML = `
			<div class="p-4">
				<button id="expandBtn" class="text-turkuazz hover:text-white transition-colors text-sm mb-4">
					▼ expand
				</button>
				
				<nav id="categoryTree" class="space-y-1">
					<!-- dynamic -->
				</nav>
			</div>
		`
	}

	const getCategories = async () => {
		if (!localStorage.getItem("all_categories")){
			loggerSidebar.info("waiting for catgs")
			await new Promise(resolve => setTimeout(resolve, 750))
			return getCategories()
		}
		let allCatgs = JSON.parse(localStorage.getItem("all_categories"))
		loggerSidebar.debug("typeof allCatgs", typeof allCatgs)
		return allCatgs
	}

	const makeCategoryHtml = (categoryName, subsObj, parent="") => {
		const subObjKeys = Object.keys(subsObj)
		const hasSubcategories = subObjKeys.length > 0
		
		var html = `
			<div class="category-item">
				<div class="flex items-center justify-between p-2 rounded category-header">
					<span class="text-turkuazz" onclick="
						loggerSidebar.info('${parent}${categoryName}/')
						window.location.href='category.html?catg=${parent}${categoryName}/'
					">${categoryName}</span>
					${hasSubcategories ? '<span class="category-toggle">▷</span>' : ''}
				</div>				
		`
		
		if (hasSubcategories) {
			html += `<div class="subcategory ml-4">`
			subObjKeys.forEach((indexName) => {
				html += makeCategoryHtml(indexName, subsObj[indexName], `${parent}${categoryName}/`)
			})
			html += `</div>`
		}
		
		html += `</div>`
		return html
	}

	const populateCategories = async () => {
		makeSidebar()

		const categoryTreeEl = document.querySelector("#categoryTree")
		const catgs = await getCategories()
		var html = ``

		// if (catgs.personal) {
		// 	let personalObj = catgs.personal
		// 	if (typeof personalObj === 'string') {
		// 		try {
		// 			personalObj = JSON.parse(personalObj)
		// 		} catch (e) {
		// 			personalObj = {}
		// 		}
		// 	}
		// 	Object.keys(personalObj).forEach((indexName) => {
		// 		console.log("personal", indexName)
		// 		html += makeCategoryHtml(indexName, personalObj[indexName])
		// 	})
		// }
		// if (catgs.shared) {
		// 	Object.keys(catgs.shared).forEach((indexName) => {
		// 		console.log("shared",indexName)
		// 		html += makeCategoryHtml(indexName, catgs.shared[indexName])
		// 	})
		// }
		loggerSidebar.debug("222typeof catgs", typeof catgs)
		Object.keys(catgs).forEach((indexName) => {
			loggerSidebar.debug("processing category", indexName)
			html += makeCategoryHtml(indexName, catgs[indexName])
			// if (indexName !== 'personal' && indexName !== 'shared') {
			// 	html += makeCategoryHtml(indexName, catgs[indexName])
			// }
		})

		categoryTreeEl.innerHTML = html

		attachCategoryEventListeners()
		setupExpandButton()
	}

	const calculateExpandedHeight = (element) => {
		const originalMaxHeight = element.style.maxHeight
		const originalOverflow = element.style.overflow
		
		element.style.maxHeight = 'none'
		element.style.overflow = 'visible'
		
		const height = element.scrollHeight
		
		element.style.maxHeight = originalMaxHeight
		element.style.overflow = originalOverflow
		
		return height
	}

	const toggleCategory = (item, subcategory, toggle) => {
		const isExpanded = subcategory.classList.contains('expanded')
		
		if (isExpanded) {
			// collapse
			subcategory.style.maxHeight = '0px'
			subcategory.classList.remove('expanded')
			toggle.textContent = '▷'
			item.classList.remove('category-expanded')
		} else {
			// expand
			const height = calculateExpandedHeight(subcategory)
			subcategory.style.maxHeight = height + 'px'
			subcategory.classList.add('expanded')
			toggle.textContent = '▼'
			item.classList.add('category-expanded')
			
			setTimeout(() => {
				if (subcategory.classList.contains('expanded')) {
					subcategory.style.maxHeight = 'none'
				}
			}, 300)
		}
	}

	const attachCategoryEventListeners = () => {
		const categoryItems = document.querySelectorAll('.category-item')
		
		categoryItems.forEach(item => {
			const toggle = item.querySelector('.category-toggle')
			const subcategory = item.querySelector('.subcategory')
			const header = item.querySelector('.category-header')
			
			if (toggle && subcategory && header) {
				header.removeEventListener('click', header.clickHandler)
				
				header.clickHandler = function(e) {
					e.stopPropagation()
					toggleCategory(item, subcategory, toggle)
				}
				
				header.addEventListener('click', header.clickHandler)
			}
		})
	}

	const setupExpandButton = () => {
		const expandBtn = document.getElementById('expandBtn')
		let allExpanded = false

		expandBtn.addEventListener('click', function() {
			allExpanded = !allExpanded
			const categoryItems = document.querySelectorAll('.category-item')
			
			categoryItems.forEach(item => {
				const toggle = item.querySelector('.category-toggle')
				const subcategory = item.querySelector('.subcategory')
				
				if (toggle && subcategory) {
					if (allExpanded) {
						const height = calculateExpandedHeight(subcategory)
						subcategory.style.maxHeight = height + 'px'
						subcategory.classList.add('expanded')
						toggle.textContent = '▼'
						item.classList.add('category-expanded')
						
						setTimeout(() => {
							if (subcategory.classList.contains('expanded')) {
								subcategory.style.maxHeight = 'none'
							}
						}, 300)
					} else {
						subcategory.style.maxHeight = '0px'
						subcategory.classList.remove('expanded')
						toggle.textContent = '▷'
						item.classList.remove('category-expanded')
					}
				}
			})
			
			expandBtn.textContent = allExpanded ? '▲ collapse' : '▼ expand'
		})
	}

	populateCategories()

	const searchInput = document.querySelector('input[placeholder="Search..."]')
	if (searchInput) {
		searchInput.addEventListener('input', function(e) {
			const searchTerm = e.target.value.toLowerCase()
			const videoCards = document.querySelectorAll('.video-card')
			
			videoCards.forEach(card => {
				const title = card.querySelector('a').textContent.toLowerCase()
				if (title.includes(searchTerm)) {
					card.style.display = 'block'
				} else {
					card.style.display = searchTerm === '' ? 'block' : 'none'
				}
			})
		})
	}

	
})