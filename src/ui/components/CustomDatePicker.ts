/**
 * Unified Custom Date Picker Component for both Hijri and Gregorian calendars
 */
import moment from "moment-hijri";

/**
 * Calendar type
 */
export type CalendarType = "hijri" | "gregorian";

/**
 * Hijri month names in Arabic
 */
const HIJRI_MONTHS = [
	"محرم",
	"صفر",
	"ربيع الأول",
	"ربيع الآخر",
	"جمادى الأولى",
	"جمادى الآخرة",
	"رجب",
	"شعبان",
	"رمضان",
	"شوال",
	"ذو القعدة",
	"ذو الحجة",
];

/**
 * Gregorian month names in Arabic
 */
const GREGORIAN_MONTHS = [
	"يناير",
	"فبراير",
	"مارس",
	"أبريل",
	"مايو",
	"يونيو",
	"يوليو",
	"أغسطس",
	"سبتمبر",
	"أكتوبر",
	"نوفمبر",
	"ديسمبر",
];

/**
 * Interface for date picker options
 */
interface CustomDatePickerOptions {
	/** Calendar type (hijri or gregorian) */
	calendarType?: CalendarType;
	/** Initial date value */
	value?: string;
	/** Date format */
	format?: string;
	/** Placeholder text */
	placeholder?: string;
	/** Callback when date changes */
	onChange?: (date: string) => void;
	/** Whether the picker is disabled */
	disabled?: boolean;
	/** CSS classes to add */
	className?: string;
}

/**
 * Unified Custom Date Picker Component
 */
export class CustomDatePicker {
	private container: HTMLElement;
	private input: HTMLInputElement;
	private picker: HTMLElement | null = null;
	private options: CustomDatePickerOptions;
	private isOpen = false;
	private currentDate: moment.Moment;
	private selectedDate: string = "";
	private documentClickHandler: ((e: Event) => void) | null = null;
	private calendarType: CalendarType;

	constructor(container: HTMLElement, options: CustomDatePickerOptions = {}) {
		this.container = container;
		this.calendarType = options.calendarType || "gregorian";
		this.options = {
			format: this.getDefaultFormat(),
			placeholder: this.getDefaultPlaceholder(),
			...options,
		};

		// Initialize with current date or provided value
		if (options.value) {
			try {
				this.currentDate = this.parseDate(
					options.value,
					this.options.format!
				);
				if (!this.currentDate.isValid()) {
					console.warn("Invalid initial date:", options.value);
					this.currentDate = moment();
				}
			} catch (error) {
				console.warn(
					"Error parsing initial date:",
					options.value,
					error
				);
				this.currentDate = moment();
			}
		} else {
			this.currentDate = moment();
		}

		this.selectedDate = options.value || "";

		this.createInput();
		this.bindEvents();
	}

	/**
	 * Gets default format based on calendar type
	 */
	private getDefaultFormat(): string {
		return this.calendarType === "hijri" ? "iYYYY/iMM/iDD" : "YYYY/MM/DD";
	}

	/**
	 * Gets default placeholder based on calendar type
	 */
	private getDefaultPlaceholder(): string {
		return this.calendarType === "hijri"
			? "اختر التاريخ الهجري"
			: "اختر التاريخ الميلادي";
	}

	/**
	 * Parses date string based on calendar type
	 */
	private parseDate(dateStr: string, format: string): moment.Moment {
		if (this.calendarType === "hijri") {
			// For Hijri dates, use moment with the hijri format
			return moment(dateStr, format);
		} else {
			// For Gregorian dates, use standard moment parsing
			return moment(dateStr, format);
		}
	}

	/**
	 * Formats date based on calendar type
	 */
	private formatDate(date: moment.Moment, format: string): string {
		// Both Hijri and Gregorian use the same format method
		// moment-hijri extends moment to handle iYYYY, iMM, iDD formats automatically
		return date.format(format);
	}

	/**
	 * Gets month names based on calendar type
	 */
	private getMonthNames(): string[] {
		return this.calendarType === "hijri" ? HIJRI_MONTHS : GREGORIAN_MONTHS;
	}

	/**
	 * Gets current month number (1-based for display)
	 */
	private getCurrentMonth(): number {
		if (this.calendarType === "hijri") {
			return this.currentDate.iMonth() + 1; // iMonth() returns 0-11, so add 1 for display
		} else {
			return this.currentDate.month() + 1; // month() returns 0-11, so add 1 for display
		}
	}

	/**
	 * Sets current month (1-based input)
	 */
	private setCurrentMonth(month: number): void {
		if (this.calendarType === "hijri") {
			this.currentDate.iMonth(month - 1); // iMonth() expects 0-11, so subtract 1
		} else {
			this.currentDate.month(month - 1); // month() expects 0-11, so subtract 1
		}
	}

	/**
	 * Gets current year
	 */
	private getCurrentYear(): number {
		return this.calendarType === "hijri"
			? this.currentDate.iYear()
			: this.currentDate.year();
	}

	/**
	 * Sets current year
	 */
	private setCurrentYear(year: number): void {
		if (this.calendarType === "hijri") {
			this.currentDate.iYear(year);
		} else {
			this.currentDate.year(year);
		}
	}

	/**
	 * Gets current date (1-based)
	 */
	private getCurrentDate(): number {
		if (this.calendarType === "hijri") {
			return this.currentDate.iDate(); // iDate() returns 1-based day
		} else {
			return this.currentDate.date(); // date() returns 1-based day
		}
	}

	/**
	 * Sets current date (1-based)
	 */
	private setCurrentDate(date: number): void {
		if (this.calendarType === "hijri") {
			this.currentDate.iDate(date); // iDate() expects 1-based day
		} else {
			this.currentDate.date(date); // date() expects 1-based day
		}
	}

	/**
	 * Gets days in current month
	 */
	private getDaysInMonth(): number {
		return this.calendarType === "hijri"
			? this.currentDate.iDaysInMonth()
			: this.currentDate.daysInMonth();
	}

	/**
	 * Adds time to current date
	 */
	private addTime(amount: number, unit: "month" | "year"): void {
		if (this.calendarType === "hijri") {
			this.currentDate.add(amount, unit === "month" ? "iMonth" : "iYear");
		} else {
			this.currentDate.add(amount, unit);
		}
	}

	/**
	 * Subtracts time from current date
	 */
	private subtractTime(amount: number, unit: "month" | "year"): void {
		if (this.calendarType === "hijri") {
			this.currentDate.subtract(
				amount,
				unit === "month" ? "iMonth" : "iYear"
			);
		} else {
			this.currentDate.subtract(amount, unit);
		}
	}

	/**
	 * Creates the input element
	 */
	private createInput(): void {
		this.input = this.container.createEl("input", {
			type: "text",
			cls: `library-custom-date-input ${this.options.className || ""}`,
			attr: {
				placeholder: this.options.placeholder || "",
				readonly: "true",
			},
		});

		if (this.selectedDate) {
			this.input.value = this.selectedDate;
		}

		if (this.options.disabled) {
			this.input.disabled = true;
		}

		// Add calendar icon
		const iconContainer = this.container.createEl("div", {
			cls: "library-date-picker-icon",
		});

		iconContainer.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
            </svg>
        `;
	}

	/**
	 * Binds event listeners
	 */
	private bindEvents(): void {
		// Open picker on input click
		this.input.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (!this.options.disabled) {
				this.togglePicker();
			}
		});

		// Open picker on icon click
		this.container
			.querySelector(".library-date-picker-icon")
			?.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (!this.options.disabled) {
					this.togglePicker();
				}
			});

		// Close picker when clicking outside - use a more specific handler
		this.documentClickHandler = (e: Event) => {
			if (
				this.isOpen &&
				this.picker &&
				!this.container.contains(e.target as Node) &&
				!this.picker.contains(e.target as Node)
			) {
				this.closePicker();
			}
		};

		// Handle keyboard navigation
		this.input.addEventListener("keydown", (e) => {
			if (this.options.disabled) return;

			switch (e.key) {
				case "Enter":
				case " ":
					e.preventDefault();
					this.togglePicker();
					break;
				case "Escape":
					if (this.isOpen) {
						e.preventDefault();
						this.closePicker();
					}
					break;
			}
		});
	}

	/**
	 * Toggles the picker visibility
	 */
	private togglePicker(): void {
		if (this.isOpen) {
			this.closePicker();
		} else {
			this.openPicker();
		}
	}

	/**
	 * Opens the date picker
	 */
	private openPicker(): void {
		if (this.isOpen) return;

		this.isOpen = true;
		this.createPicker();
		this.positionPicker();

		// Add document click listener to close picker when clicking outside
		if (this.documentClickHandler) {
			document.addEventListener("click", this.documentClickHandler);
		}

		// Focus management
		setTimeout(() => {
			const firstButton = this.picker?.querySelector("button");
			firstButton?.focus();
		}, 0);
	}

	/**
	 * Closes the date picker
	 */
	private closePicker(): void {
		if (!this.isOpen) return;

		this.isOpen = false;

		// Remove document click listener
		if (this.documentClickHandler) {
			document.removeEventListener("click", this.documentClickHandler);
		}

		if (this.picker) {
			this.picker.remove();
			this.picker = null;
		}

		this.input.focus();
	}

	/**
	 * Creates the picker element
	 */
	private createPicker(): void {
		this.picker = document.body.createEl("div", {
			cls: `library-custom-date-picker library-${this.calendarType}-date-picker`,
		});

		// Prevent all clicks inside the picker from bubbling up
		this.picker.addEventListener("click", (e) => {
			e.stopPropagation();
		});

		this.createHeader();
		this.createCalendar();
		this.createFooter();
	}

	/**
	 * Creates the picker header with navigation
	 */
	private createHeader(): void {
		if (!this.picker) return;

		const header = this.picker.createEl("div", {
			cls: "library-date-picker-header",
		});

		// Previous year button
		const prevYearBtn = header.createEl("button", {
			cls: "library-date-picker-nav",
			attr: { "aria-label": "السنة السابقة" },
		});
		prevYearBtn.innerHTML = "«";
		prevYearBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.subtractTime(1, "year");
			this.updateCalendar();
		});

		// Previous month button
		const prevMonthBtn = header.createEl("button", {
			cls: "library-date-picker-nav",
			attr: { "aria-label": "الشهر السابق" },
		});
		prevMonthBtn.innerHTML = "‹";
		prevMonthBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.subtractTime(1, "month");
			this.updateCalendar();
		});

		// Month/Year display
		const monthYear = header.createEl("div", {
			cls: "library-date-picker-month-year",
		});

		const monthSelect = monthYear.createEl("select", {
			cls: "library-date-picker-month-select",
		});

		this.getMonthNames().forEach((month, index) => {
			const monthValue = index + 1; // Convert 0-based index to 1-based month number
			const option = monthSelect.createEl("option", {
				value: monthValue.toString(),
				text: month,
			});
			if (monthValue === this.getCurrentMonth()) {
				option.selected = true;
			}
		});

		monthSelect.addEventListener("click", (e) => {
			e.stopPropagation();
		});

		monthSelect.addEventListener("change", (e) => {
			e.stopPropagation();
			const selectedMonth = parseInt(monthSelect.value); // 1-based value from dropdown
			this.setCurrentMonth(selectedMonth);
			this.updateCalendar();
		});

		const yearInput = monthYear.createEl("input", {
			type: "number",
			cls: "library-date-picker-year-input",
			value: this.getCurrentYear().toString(),
			attr: {
				min: "1",
				max: "9999",
			},
		});

		yearInput.addEventListener("click", (e) => {
			e.stopPropagation();
		});

		yearInput.addEventListener("focus", (e) => {
			e.stopPropagation();
		});

		yearInput.addEventListener("change", (e) => {
			e.stopPropagation();
			const year = parseInt(yearInput.value);
			if (year > 0 && year < 10000) {
				this.setCurrentYear(year);
				this.updateCalendar();
			}
		});

		// Next month button
		const nextMonthBtn = header.createEl("button", {
			cls: "library-date-picker-nav",
			attr: { "aria-label": "الشهر التالي" },
		});
		nextMonthBtn.innerHTML = "›";
		nextMonthBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.addTime(1, "month");
			this.updateCalendar();
		});

		// Next year button
		const nextYearBtn = header.createEl("button", {
			cls: "library-date-picker-nav",
			attr: { "aria-label": "السنة التالية" },
		});
		nextYearBtn.innerHTML = "»";
		nextYearBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.addTime(1, "year");
			this.updateCalendar();
		});
	}

	/**
	 * Creates the calendar grid
	 */
	private createCalendar(): void {
		if (!this.picker) return;

		const calendar = this.picker.createEl("div", {
			cls: "library-date-picker-calendar",
		});

		// Day headers
		const daysHeader = calendar.createEl("div", {
			cls: "library-date-picker-days-header",
		});

		const dayNames = ["ح", "ن", "ث", "ر", "خ", "ج", "س"]; // Sunday to Saturday in Arabic
		dayNames.forEach((day) => {
			daysHeader.createEl("div", {
				cls: "library-date-picker-day-header",
				text: day,
			});
		});

		// Calendar grid
		this.updateCalendar();
	}

	/**
	 * Updates the calendar grid
	 */
	private updateCalendar(): void {
		if (!this.picker) return;

		let calendarGrid = this.picker.querySelector(
			".library-date-picker-grid"
		);
		if (calendarGrid) {
			calendarGrid.remove();
		}

		const calendar = this.picker.querySelector(
			".library-date-picker-calendar"
		);
		if (!calendar) return;

		calendarGrid = calendar.createEl("div", {
			cls: "library-date-picker-grid",
		});

		// Update month/year selectors
		const monthSelect = this.picker.querySelector(
			".library-date-picker-month-select"
		) as HTMLSelectElement;
		const yearInput = this.picker.querySelector(
			".library-date-picker-year-input"
		) as HTMLInputElement;

		if (monthSelect) monthSelect.value = this.getCurrentMonth().toString();
		if (yearInput) yearInput.value = this.getCurrentYear().toString();

		// Get first day of the month - create a proper clone and set to day 1
		const firstDay = this.currentDate.clone();
		if (this.calendarType === "hijri") {
			firstDay.iDate(1); // Set to first day of the current Hijri month
		} else {
			firstDay.date(1); // Set to first day of the current Gregorian month
		}
		const startOfWeek = firstDay.day(); // 0 = Sunday

		// Get number of days in the month
		const daysInMonth = this.getDaysInMonth();

		// Add empty cells for days before the first day of the month
		for (let i = 0; i < startOfWeek; i++) {
			calendarGrid.createEl("div", {
				cls: "library-date-picker-day library-date-picker-day-empty",
			});
		}

		// Add days of the month
		for (let day = 1; day <= daysInMonth; day++) {
			const dayButton = calendarGrid.createEl("button", {
				cls: "library-date-picker-day",
				text: day.toString(),
				attr: { type: "button" },
			});

			// Create a completely fresh moment object for this specific day
			let dayDate: moment.Moment;
			if (this.calendarType === "hijri") {
				// For Hijri: use the current year, month, and the loop day
				const year = this.getCurrentYear();
				const month = this.getCurrentMonth() - 1; // Convert to 0-based for iMonth()

				// Create a base moment and then set Hijri components
				dayDate = moment();
				dayDate.iYear(year);
				dayDate.iMonth(month); // iMonth() expects 0-11
				dayDate.iDate(day);

				// Debug for first day only
				if (day === 1) {
				}
			} else {
				// For Gregorian: use standard moment creation
				const year = this.getCurrentYear();
				const month = this.getCurrentMonth() - 1; // Convert to 0-based for moment

				dayDate = moment([year, month, day]);
			}

			const formattedDate = this.formatDate(
				dayDate,
				this.options.format!
			);

			// Store the day number in a data attribute for debugging
			dayButton.setAttribute("data-day", day.toString());
			dayButton.setAttribute("data-formatted", formattedDate);

			// Check if this is the selected date
			if (this.selectedDate === formattedDate) {
				dayButton.addClass("library-date-picker-day-selected");
			}

			// Check if this is today
			const today = moment();
			let isToday = false;
			if (this.calendarType === "hijri") {
				// For Hijri, compare using individual components
				isToday =
					dayDate.iYear() === today.iYear() &&
					dayDate.iMonth() === today.iMonth() &&
					dayDate.iDate() === today.iDate();
			} else {
				// For Gregorian, use standard comparison
				isToday =
					dayDate.year() === today.year() &&
					dayDate.month() === today.month() &&
					dayDate.date() === today.date();
			}

			if (isToday) {
				dayButton.addClass("library-date-picker-day-today");
			}

			dayButton.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.selectDate(dayDate);
			});
		}
	}

	/**
	 * Creates the picker footer
	 */
	private createFooter(): void {
		if (!this.picker) return;

		const footer = this.picker.createEl("div", {
			cls: "library-date-picker-footer",
		});

		// Today button
		const todayBtn = footer.createEl("button", {
			cls: "library-date-picker-today",
			text: "اليوم",
			attr: { type: "button" },
		});

		todayBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			// Create today's date in the current calendar system
			const today = moment(); // This gets current Gregorian date
			this.selectDate(today);
		});

		// Clear button
		const clearBtn = footer.createEl("button", {
			cls: "library-date-picker-clear",
			text: "مسح",
			attr: { type: "button" },
		});

		clearBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.selectDate(null);
		});
	}

	/**
	 * Selects a date
	 */
	private selectDate(date: moment.Moment | null): void {
		if (date) {
			const formattedDate = this.formatDate(date, this.options.format!);

			this.selectedDate = formattedDate;
			this.input.value = this.selectedDate;
		} else {
			this.selectedDate = "";
			this.input.value = "";
		}

		if (this.options.onChange) {
			this.options.onChange(this.selectedDate);
		}

		this.closePicker();
	}

	/**
	 * Positions the picker relative to the input
	 */
	private positionPicker(): void {
		if (!this.picker) return;

		const inputRect = this.input.getBoundingClientRect();
		const pickerHeight = 350; // Approximate picker height
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - inputRect.bottom;
		const spaceAbove = inputRect.top;

		// Position below input if there's enough space, otherwise above
		if (spaceBelow >= pickerHeight || spaceBelow >= spaceAbove) {
			this.picker.style.top = `${
				inputRect.bottom + window.scrollY + 4
			}px`;
		} else {
			this.picker.style.top = `${
				inputRect.top + window.scrollY - pickerHeight - 4
			}px`;
		}

		this.picker.style.left = `${inputRect.left + window.scrollX}px`;
		this.picker.style.minWidth = `${inputRect.width}px`;
	}

	/**
	 * Gets the current value
	 */
	public getValue(): string {
		return this.selectedDate;
	}

	/**
	 * Sets the value
	 */
	public setValue(value: string): void {
		this.selectedDate = value;
		this.input.value = value;

		if (value) {
			try {
				// Parse the date according to the current calendar type and format
				this.currentDate = this.parseDate(value, this.options.format!);

				// Validate that the parsed date is valid
				if (!this.currentDate.isValid()) {
					console.warn("Invalid date parsed:", value);
					this.currentDate = moment();
				}
			} catch (error) {
				console.warn("Error parsing date:", value, error);
				this.currentDate = moment();
			}
		} else {
			this.currentDate = moment();
		}
	}

	/**
	 * Sets the calendar type
	 */
	public setCalendarType(calendarType: CalendarType): void {
		if (this.calendarType === calendarType) {
			return; // No change needed
		}

		// Store the current selected date value before changing calendar type
		const currentValue = this.selectedDate;

		this.calendarType = calendarType;
		this.options.format = this.getDefaultFormat();
		this.options.placeholder = this.getDefaultPlaceholder();

		// Update input placeholder
		this.input.setAttribute("placeholder", this.options.placeholder);

		// If we had a selected date, we need to re-parse it with the new calendar type
		if (currentValue) {
			try {
				this.currentDate = this.parseDate(
					currentValue,
					this.options.format
				);
				if (!this.currentDate.isValid()) {
					this.currentDate = moment();
				}
			} catch (error) {
				console.warn(
					"Error re-parsing date after calendar type change:",
					error
				);
				this.currentDate = moment();
			}
		}

		// If picker is open, recreate it with new calendar type
		if (this.isOpen) {
			this.closePicker();
			this.openPicker();
		}
	}

	/**
	 * Destroys the date picker
	 */
	public destroy(): void {
		this.closePicker();

		// Clean up document click listener
		if (this.documentClickHandler) {
			document.removeEventListener("click", this.documentClickHandler);
			this.documentClickHandler = null;
		}

		this.input.remove();
		this.container.querySelector(".library-date-picker-icon")?.remove();
	}

	/**
	 * Sets the disabled state
	 */
	public setDisabled(disabled: boolean): void {
		this.options.disabled = disabled;
		this.input.disabled = disabled;

		if (disabled) {
			this.input.addClass("disabled");
		} else {
			this.input.removeClass("disabled");
		}
	}
}
