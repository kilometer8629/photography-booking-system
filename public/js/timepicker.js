/**
 * Custom Time Picker Component
 * Provides a user-friendly, mobile-responsive time picker
 * Replaces flatpickr time picker for better UX
 */

class TimePickerDropdown {
  constructor(inputElement, options = {}) {
    this.input = inputElement;
    this.options = {
      start: options.start || 10,    // Start hour (24-hour format)
      end: options.end || 16,        // End hour (24-hour format)
      interval: options.interval || 5, // Minutes interval
      format12h: options.format12h !== false, // Use 12-hour format
      ...options
    };
    
    this.dropdown = null;
    this.isOpen = false;
    this.selectedTime = null;
    
    this.init();
  }
  
  init() {
    // Create dropdown container
    this.createDropdown();
    
    // Set up event listeners
    this.input.addEventListener('focus', () => this.open());
    this.input.addEventListener('click', () => this.open());
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target !== this.input && e.target !== this.dropdown && !this.dropdown.contains(e.target)) {
        this.close();
      }
    });
    
    // Parse existing value if present
    if (this.input.value) {
      this.parseInputValue();
    }
  }
  
  createDropdown() {
    // Create container
    const container = document.createElement('div');
    container.className = 'timepicker-dropdown';
    
    // Create scrollable time list
    const timeList = document.createElement('div');
    timeList.className = 'timepicker-list';
    
    // Generate time slots
    const times = this.generateTimeSlots();
    times.forEach(time => {
      const slot = document.createElement('div');
      slot.className = 'timepicker-slot';
      slot.textContent = time;
      slot.dataset.value = this.convertTo24Hour(time);
      
      slot.addEventListener('click', () => this.selectTime(time, slot));
      slot.addEventListener('hover', () => slot.classList.add('hover'));
      
      timeList.appendChild(slot);
    });
    
    container.appendChild(timeList);
    this.dropdown = container;
    
    // Add to DOM (but hidden)
    document.body.appendChild(container);
  }
  
  generateTimeSlots() {
    const slots = [];
    const interval = this.options.interval;
    
    for (let hour = this.options.start; hour <= this.options.end; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const time = this.formatTime(hour, minute);
        slots.push(time);
      }
    }
    
    return slots;
  }
  
  formatTime(hour, minute) {
    if (this.options.format12h) {
      const period = hour >= 12 ? 'pm' : 'am';
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const displayMin = minute < 10 ? '0' + minute : minute;
      return `${displayHour}:${displayMin} ${period}`;
    } else {
      const h = hour < 10 ? '0' + hour : hour;
      const m = minute < 10 ? '0' + minute : minute;
      return `${h}:${m}`;
    }
  }
  
  convertTo24Hour(time12h) {
    // Parse 12-hour format to 24-hour
    const match = time12h.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!match) return time12h; // Already 24-hour format
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toLowerCase();
    
    if (period === 'am' && hours === 12) hours = 0;
    if (period === 'pm' && hours !== 12) hours += 12;
    
    const h = hours < 10 ? '0' + hours : hours;
    return `${h}:${minutes}`;
  }
  
  open() {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.dropdown.classList.add('active');
    
    // Position dropdown
    this.positionDropdown();
    
    // Scroll to current selection if exists
    if (this.input.value) {
      setTimeout(() => this.scrollToSelected(), 50);
    }
  }
  
  close() {
    this.isOpen = false;
    this.dropdown.classList.remove('active');
  }
  
  positionDropdown() {
    const rect = this.input.getBoundingClientRect();
    const dropdownHeight = 300; // Approximate height
    
    // Position below input by default
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;
    
    // Check if dropdown would go off-screen
    if (top + dropdownHeight > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - dropdownHeight - 5;
    }
    
    // Keep within left/right bounds
    const width = this.dropdown.offsetWidth;
    if (left + width > window.innerWidth) {
      left = window.innerWidth - width - 10;
    }
    if (left < 0) left = 10;
    
    this.dropdown.style.top = top + 'px';
    this.dropdown.style.left = left + 'px';
  }
  
  selectTime(time, slot) {
    this.input.value = time;
    this.selectedTime = time;
    
    // Update visual selection
    this.dropdown.querySelectorAll('.timepicker-slot').forEach(s => {
      s.classList.remove('selected');
    });
    slot.classList.add('selected');
    
    // Trigger change event
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Close dropdown
    this.close();
  }
  
  scrollToSelected() {
    const selected = this.dropdown.querySelector('.timepicker-slot.selected');
    if (selected) {
      const list = this.dropdown.querySelector('.timepicker-list');
      const itemHeight = selected.offsetHeight;
      const containerHeight = list.offsetHeight;
      
      // Center the selected item
      list.scrollTop = selected.offsetTop - (containerHeight / 2) + (itemHeight / 2);
    }
  }
  
  parseInputValue() {
    const value = this.input.value.trim();
    const slot = this.dropdown.querySelector(`[data-value="${value}"]`);
    if (!slot) {
      // Try to find by display value
      const slots = Array.from(this.dropdown.querySelectorAll('.timepicker-slot'));
      const match = slots.find(s => s.textContent === value);
      if (match) {
        match.classList.add('selected');
        this.selectedTime = value;
      }
    } else {
      slot.classList.add('selected');
      this.selectedTime = value;
    }
  }
  
  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.close();
      return;
    }
    
    if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      e.preventDefault();
      this.open();
    }
  }
}

// Initialize all time pickers on page load
document.addEventListener('DOMContentLoaded', function() {
  const timeInputs = document.querySelectorAll('.custom-time-picker');
  console.log('🎯 TimePickerDropdown: Found', timeInputs.length, 'time picker inputs');
  
  timeInputs.forEach((input, index) => {
    try {
      new TimePickerDropdown(input, {
        start: parseInt(input.dataset.start || 10),
        end: parseInt(input.dataset.end || 16),
        interval: parseInt(input.dataset.interval || 5),
        format12h: input.dataset.format12h !== 'false'
      });
      console.log('✅ TimePickerDropdown #' + (index + 1) + ' initialized for:', input.id);
    } catch (e) {
      console.error('❌ TimePickerDropdown failed for #' + (index + 1) + ':', e);
    }
  });
});

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimePickerDropdown;
}
