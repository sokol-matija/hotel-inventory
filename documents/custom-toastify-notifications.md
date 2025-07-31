# Custom Toastify Notification System

A modern, customizable notification system built with GSAP animations. This guide contains everything you need to implement reusable toast notifications in your projects.

## Features

- 🎨 Dark mode design with glassmorphism effects
- 🚀 Smooth GSAP animations (slide-in, scale, bounce effects)
- 📱 Fully responsive design
- ⏰ Progress indicators (circular and linear)
- 🎯 Multiple notification types (success, error, info)
- 📚 Multiple implementations (Pure GSAP, SweetAlert2, Notiflix)
- 🎭 Auto-stacking for multiple notifications
- 🖱️ Click to close functionality
- ⏸️ Pause on hover support

## Implementation Options

### 1. Pure GSAP Implementation (Recommended)

#### JavaScript - `notification.js`

```javascript
// Modern Notification System
// A reusable notification system built with GSAP

class GsapNotification {
    constructor() {
        // Create container if it doesn't exist
        this.createNotificationContainer();
        
        // Store references to DOM elements
        this.container = document.getElementById('notificationContainer');
        this.notification = this.container.querySelector('.notification');
        this.progressBar = this.notification.querySelector('.notification-progress-bar');
    }
    
    createNotificationContainer() {
        // Check if container already exists
        if (document.getElementById('notificationContainer')) {
            return;
        }
        
        // Create container and add to body
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        
        container.innerHTML = `
            <div class="notification">
                <div class="notification-content">
                    <div class="notification-icon">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="none" d="M0 0h24v24H0z"/>
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="notification-text">
                        <h3>Success!</h3>
                        <p>Your action has been completed successfully.</p>
                    </div>
                </div>
                <div class="notification-progress">
                    <div class="notification-progress-bar"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
    }
    
    /**
     * Show a notification
     * @param {string} type - Type of notification: 'success', 'error', or 'info'
     * @param {string} title - Title of the notification
     * @param {string} message - Message to display
     * @param {number} duration - Duration in seconds before notification disappears
     * @returns {gsap.core.Timeline} - The GSAP timeline for the animation
     */
    show(type = 'success', title = 'Success!', message = 'Your action has been completed successfully.', duration = 4) {
        // Reset notification classes and add the type class if needed
        this.notification.className = 'notification';
        if (type !== 'success') {
            this.notification.classList.add(type);
        }
        
        // Update content
        const titleElement = this.notification.querySelector('h3');
        const messageElement = this.notification.querySelector('p');
        titleElement.textContent = title;
        messageElement.textContent = message;
        
        // Update icon based on type
        const iconElement = this.notification.querySelector('.notification-icon svg');
        if (type === 'success') {
            iconElement.innerHTML = `
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>
            `;
        } else if (type === 'error') {
            iconElement.innerHTML = `
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            `;
        } else if (type === 'info') {
            iconElement.innerHTML = `
                <path fill="none" d="M0 0h24v24H0z"/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
            `;
        }
        
        // Create a timeline for the notification animation
        const tl = gsap.timeline();
        
        // First, make the container visible
        tl.set(this.container, { 
            visibility: 'visible',
            opacity: 1
        });
        
        // Animate the notification sliding in from the bottom right with improved animation
        tl.fromTo(this.notification, {
            y: 20,
            x: 40,
            opacity: 0,
            scale: 0.95,
            rotation: 0.5,
            transformOrigin: 'right bottom'
        }, {
            y: 0,
            x: 0,
            opacity: 1,
            scale: 1,
            rotation: 0,
            duration: 0.6,
            ease: 'power3.out'
        });
        
        // Add a subtle bounce effect to the icon
        tl.fromTo(this.notification.querySelector('.notification-icon'), {
            scale: 0.5,
            opacity: 0
        }, {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            ease: 'back.out(2.5)'
        }, '-=0.4');
        
        // Animate the progress bar
        tl.fromTo(this.progressBar, {
            scaleX: 0
        }, {
            scaleX: 1,
            duration: duration,
            ease: 'none'
        }, '<'); // Start at the same time as the previous animation
        
        // After the duration, slide out the notification with improved exit animation
        tl.to(this.notification, {
            x: 100,
            opacity: 0,
            scale: 0.95,
            duration: 0.5,
            delay: duration, // Wait for the progress bar to complete
            ease: 'power3.inOut',
            onComplete: () => {
                // Hide the container when animation is complete
                gsap.set(this.container, { 
                    visibility: 'hidden',
                    opacity: 0
                });
            }
        });
        
        return tl;
    }
    
    /**
     * Show a success notification
     */
    success(title = 'Success!', message = 'Your action has been completed successfully.', duration = 4) {
        return this.show('success', title, message, duration);
    }
    
    /**
     * Show an error notification
     */
    error(title = 'Error!', message = 'Something went wrong. Please try again.', duration = 4) {
        return this.show('error', title, message, duration);
    }
    
    /**
     * Show an info notification
     */
    info(title = 'Information', message = 'Here is some important information for you.', duration = 4) {
        return this.show('info', title, message, duration);
    }
}

// Create a global instance
const notificationSystem = new GsapNotification();

// Export the notification system
export default notificationSystem;
```

#### CSS Styles

```css
/* CSS Variables for consistent theming */
:root {
    --glass-bg: rgba(40, 40, 40, 0.8);
    --glass-border: rgba(255, 255, 255, 0.1);
    --border-radius: 12px;
    --shadow-strong: 0 10px 40px rgba(0, 0, 0, 0.4);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Notification Container */
.notification-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
}

@media (max-width: 768px) {
    .notification-container {
        bottom: 10px;
        right: 10px;
        left: 10px;
    }
}

/* Notification Card */
.notification {
    width: 320px;
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-strong);
    position: relative;
    pointer-events: auto;
    overflow: hidden;
    border: 1px solid var(--glass-border);
    border-left: 4px solid #4CAF50;
}

@media (max-width: 768px) {
    .notification {
        width: 100%;
        max-width: 360px;
        margin: 0 auto;
    }
}

/* Notification Content */
.notification-content {
    display: flex;
    padding: 16px;
    align-items: center;
    width: 100%;
}

.notification-icon {
    width: 30px;
    height: 30px;
    color: #4CAF50;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    flex-shrink: 0;
}

.notification-text {
    flex-grow: 1;
}

.notification-content h3 {
    margin: 0 0 4px 0;
    font-size: 1rem;
    color: #fff;
    font-weight: 500;
}

.notification-content p {
    margin: 0;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.7);
}

/* Progress Bar */
.notification-progress {
    height: 3px;
    width: 100%;
    background-color: rgba(255, 255, 255, 0.1);
    overflow: hidden;
    position: absolute;
    bottom: 0;
    left: 0;
}

.notification-progress-bar {
    height: 100%;
    width: 100%;
    background-color: #4CAF50;
    transform-origin: left center;
    transform: scaleX(0);
}

/* Error notification styles */
.notification.error {
    border-left-color: #F44336;
}

.notification.error .notification-icon {
    color: #F44336;
}

.notification.error .notification-progress-bar {
    background-color: #F44336;
}

/* Info notification styles */
.notification.info {
    border-left-color: #2196F3;
}

.notification.info .notification-icon {
    color: #2196F3;
}

.notification.info .notification-progress-bar {
    background-color: #2196F3;
}

/* Responsive Design */
@media (max-width: 480px) {
    .notification {
        width: 280px;
    }
}

@media (max-width: 360px) {
    .notification {
        width: 260px;
    }
}
```

### 2. Advanced Toastify Implementation with Stacking

#### JavaScript - `external-notifications.js`

```javascript
// Toastify Notifications with Auto-Stacking
class ToastifyNotification {
    constructor() {
        // Keep track of active notifications for stacking
        this.activeNotifications = [];
        this.notificationGap = 10; // Gap between stacked notifications
    }

    /**
     * Show a notification using custom GSAP animations with a dark mode style and a colored left border
     * @param {string} type - The type of notification: 'success', 'error', or 'info'
     * @param {string} message - The message to display
     * @param {number} duration - Duration in milliseconds
     */
    show(type = 'success', message = 'Your action has been completed successfully.', duration = 4000) {
        // Set colors based on type
        let color;
        switch (type) {
            case 'success':
                color = '#4CAF50';
                break;
            case 'error':
                color = '#F44336';
                break;
            case 'info':
                color = '#2196F3';
                break;
            default:
                color = '#4CAF50';
        }

        // Create a container for our custom notification
        const notificationContainer = document.createElement('div');
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '9999';
        notificationContainer.style.opacity = '0';
        notificationContainer.style.transform = 'translateY(0)';
        document.body.appendChild(notificationContainer);

        // Create the notification element
        const notification = document.createElement('div');
        notification.style.backgroundColor = '#222';
        notification.style.color = '#fff';
        notification.style.borderRadius = '8px';
        notification.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.6)';
        notification.style.padding = '16px 20px';
        notification.style.borderLeft = `6px solid ${color}`;
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.minWidth = '320px';
        notification.style.position = 'relative';
        notification.style.overflow = 'hidden';
        notification.style.marginBottom = '0px';
        notificationContainer.appendChild(notification);

        // Create the icon container
        const iconContainer = document.createElement('div');
        iconContainer.style.position = 'relative';
        iconContainer.style.width = '36px';
        iconContainer.style.height = '36px';
        iconContainer.style.marginRight = '15px';
        iconContainer.style.flexShrink = '0';
        notification.appendChild(iconContainer);

        // Create SVG icon
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('width', '24');
        iconSvg.setAttribute('height', '24');
        iconSvg.style.position = 'absolute';
        iconSvg.style.top = '6px';
        iconSvg.style.left = '6px';
        iconSvg.style.zIndex = '2';
        iconContainer.appendChild(iconSvg);

        // Create the path for the icon
        const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        iconPath.setAttribute('fill', color);

        // Set the path based on notification type
        if (type === 'success') {
            iconPath.setAttribute('d', 'M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z');
        } else if (type === 'error') {
            iconPath.setAttribute('d', 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z');
        } else {
            iconPath.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z');
        }
        iconSvg.appendChild(iconPath);

        // Create the circular progress indicator
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        circle.setAttribute('width', '36');
        circle.setAttribute('height', '36');
        circle.setAttribute('viewBox', '0 0 36 36');
        circle.style.position = 'absolute';
        circle.style.top = '0';
        circle.style.left = '0';
        iconContainer.appendChild(circle);

        // Create background circle
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '18');
        bgCircle.setAttribute('cy', '18');
        bgCircle.setAttribute('r', '15');
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', `${color}30`);
        bgCircle.setAttribute('stroke-width', '3');
        circle.appendChild(bgCircle);

        // Create progress circle
        const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        progressCircle.setAttribute('cx', '18');
        progressCircle.setAttribute('cy', '18');
        progressCircle.setAttribute('r', '15');
        progressCircle.setAttribute('fill', 'none');
        progressCircle.setAttribute('stroke', color);
        progressCircle.setAttribute('stroke-width', '3');
        progressCircle.setAttribute('stroke-dasharray', 2 * Math.PI * 15);
        progressCircle.setAttribute('stroke-dashoffset', 2 * Math.PI * 15);
        progressCircle.setAttribute('transform', 'rotate(-90 18 18)');
        circle.appendChild(progressCircle);

        // Create the message text
        const textDiv = document.createElement('div');
        textDiv.textContent = message;
        textDiv.style.fontSize = '14px';
        textDiv.style.fontWeight = '500';
        notification.appendChild(textDiv);

        // Create a progress bar at the bottom
        const progressBar = document.createElement('div');
        progressBar.style.position = 'absolute';
        progressBar.style.bottom = '0';
        progressBar.style.left = '0';
        progressBar.style.height = '4px';
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = color;
        progressBar.style.transformOrigin = 'left';
        progressBar.style.transform = 'scaleX(0)';
        notification.appendChild(progressBar);

        // Add a close button
        const closeButton = document.createElement('div');
        closeButton.innerHTML = '&times;';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '8px';
        closeButton.style.right = '12px';
        closeButton.style.fontSize = '18px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.opacity = '0.7';
        closeButton.style.color = '#fff';
        closeButton.addEventListener('mouseover', () => {
            closeButton.style.opacity = '1';
        });
        closeButton.addEventListener('mouseout', () => {
            closeButton.style.opacity = '0.7';
        });
        notification.appendChild(closeButton);

        // Use GSAP for animations
        const durationInSeconds = duration / 1000;

        // Add this notification to our active notifications array
        this.activeNotifications.push({
            container: notificationContainer,
            height: 0, // Will be set after rendering
            timeline: null // Will be set after creating the timeline
        });

        // Position this notification based on existing notifications
        this.positionNotifications();

        // Create a timeline for the notification
        const tl = gsap.timeline({
            onComplete: () => {
                // Remove from active notifications
                const index = this.activeNotifications.findIndex(n => n.container === notificationContainer);
                if (index !== -1) {
                    this.activeNotifications.splice(index, 1);
                }

                // Remove the notification container from DOM
                if (document.body.contains(notificationContainer)) {
                    document.body.removeChild(notificationContainer);
                }

                // Reposition remaining notifications
                this.positionNotifications();
            }
        });

        // Store the timeline reference
        const notificationObj = this.activeNotifications.find(n => n.container === notificationContainer);
        if (notificationObj) {
            notificationObj.timeline = tl;
        }

        // Animate the notification in
        tl.fromTo(notificationContainer, {
            opacity: 0,
            x: 80,
            scale: 0.9
        }, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.5,
            ease: 'back.out(1.7)',
            onComplete: () => {
                // Now that the notification is visible, get its height
                if (notificationObj) {
                    notificationObj.height = notificationContainer.offsetHeight;
                    // Reposition notifications with the correct height
                    this.positionNotifications();
                }
            }
        });

        // Animate the progress circle with a bounce effect at the end
        tl.to(progressCircle, {
            strokeDashoffset: 0,
            duration: durationInSeconds,
            ease: 'linear'
        }, '<');

        // Animate the progress bar
        tl.to(progressBar, {
            scaleX: 1,
            duration: durationInSeconds,
            ease: 'linear'
        }, '<');

        // Animate the notification out
        tl.to(notificationContainer, {
            opacity: 0,
            x: 100,
            scale: 0.9,
            duration: 0.4,
            ease: 'power2.in'
        });

        // Add click handler for the close button
        closeButton.addEventListener('click', () => {
            // Skip to the end of the timeline to close immediately
            tl.progress(1);
        });

        // Return the timeline in case we want to control it later
        return tl;
    }

    /**
     * Position all active notifications to stack them properly
     */
    positionNotifications() {
        let currentOffset = 0;

        // Position notifications from bottom to top
        [...this.activeNotifications].reverse().forEach(notification => {
            gsap.to(notification.container, {
                y: -currentOffset,
                duration: 0.3,
                ease: 'power2.out'
            });

            // Update offset for next notification
            // Use the actual height if available, otherwise use an estimate
            const height = notification.height || 80;
            currentOffset += height + this.notificationGap;
        });
    }

    /**
     * Show a success notification
     */
    success(message = 'Your action has been completed successfully.', duration = 4000) {
        this.show('success', message, duration);
    }

    /**
     * Show an error notification
     */
    error(message = 'Something went wrong. Please try again.', duration = 4000) {
        this.show('error', message, duration);
    }

    /**
     * Show an info notification
     */
    info(message = 'Here is some important information for you.', duration = 4000) {
        this.show('info', message, duration);
    }
}

// Create a singleton instance of ToastifyNotification
const toastify = new ToastifyNotification();

// Export the notification system
export { toastify };
```

## Usage Examples

### Basic Usage

```javascript
// Import the notification system
import notificationSystem from './notification.js';
// OR for the advanced version
import { toastify } from './external-notifications.js';

// Show different types of notifications
notificationSystem.success('Task Complete', 'Your file has been saved successfully!');
notificationSystem.error('Upload Failed', 'Unable to upload the file. Please try again.');
notificationSystem.info('New Update', 'A new version is available for download.');

// With custom duration (in seconds for basic, milliseconds for advanced)
notificationSystem.success('Success!', 'Operation completed!', 6); // 6 seconds
toastify.success('Operation completed!', 6000); // 6 seconds
```

### HTML Integration

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Notifications</title>
    <!-- GSAP CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <!-- Your CSS -->
    <link rel="stylesheet" href="notification-styles.css">
</head>
<body>
    <!-- Your page content -->
    <div class="demo-buttons">
        <button onclick="showSuccess()">Success</button>
        <button onclick="showError()">Error</button>
        <button onclick="showInfo()">Info</button>
    </div>

    <!-- Your notification script -->
    <script type="module">
        import notificationSystem from './notification.js';
        
        window.showSuccess = () => {
            notificationSystem.success('Success!', 'Your action was completed successfully!');
        };
        
        window.showError = () => {
            notificationSystem.error('Error!', 'Something went wrong. Please try again.');
        };
        
        window.showInfo = () => {
            notificationSystem.info('Information', 'Here is some important information.');
        };
    </script>
</body>
</html>
```

## Dependencies

### Required Dependencies

1. **GSAP (GreenSock Animation Platform)**
   ```html
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
   ```

### Optional Dependencies (for additional implementations)

2. **SweetAlert2** (for SweetAlert2 notifications)
   ```html
   <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
   ```

3. **Notiflix** (for Notiflix notifications)
   ```html
   <script src="https://cdn.jsdelivr.net/npm/notiflix@3.2.6/dist/notiflix-3.2.6.min.js"></script>
   ```

## Customization

### Color Themes

You can customize the colors by modifying the CSS variables:

```css
:root {
    --success-color: #4CAF50;
    --error-color: #F44336;
    --info-color: #2196F3;
    --warning-color: #FFC107;
    
    --glass-bg: rgba(40, 40, 40, 0.8);
    --glass-border: rgba(255, 255, 255, 0.1);
    --text-primary: #fff;
    --text-secondary: rgba(255, 255, 255, 0.7);
}
```

### Animation Customization

Modify the GSAP animation parameters:

```javascript
// Entry animation
tl.fromTo(this.notification, {
    y: 20,        // Start position Y
    x: 40,        // Start position X
    opacity: 0,   // Start opacity
    scale: 0.95,  // Start scale
    rotation: 0.5 // Start rotation
}, {
    y: 0,
    x: 0,
    opacity: 1,
    scale: 1,
    rotation: 0,
    duration: 0.6,              // Animation duration
    ease: 'power3.out'          // Easing function
});
```

### Positioning

Change notification position by modifying the container styles:

```css
.notification-container {
    /* Top right */
    top: 20px;
    right: 20px;
    
    /* Top left */
    /* top: 20px; */
    /* left: 20px; */
    
    /* Bottom left */
    /* bottom: 20px; */
    /* left: 20px; */
}
```

## Advanced Features

### Multiple Notifications Stacking

The advanced implementation automatically stacks multiple notifications with smooth repositioning animations.

### Progress Indicators

- **Linear Progress Bar**: Shows at the bottom of the notification
- **Circular Progress**: Surrounds the icon (in advanced implementation)

### Interactive Features

- **Click to Close**: X button in the top-right corner
- **Pause on Hover**: Timeline pauses when hovering (in SweetAlert2 implementation)

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **Mobile**: iOS Safari 14+, Chrome Mobile 88+
- **GSAP**: Supports all browsers that GSAP supports

## Performance Notes

- Uses `transform` and `opacity` for smooth 60fps animations
- Automatically removes DOM elements after animation completion
- Minimal DOM manipulation for optimal performance
- Uses `backdrop-filter` for glassmorphism effects (progressive enhancement)

## Troubleshooting

### Common Issues

1. **GSAP not loaded**: Ensure GSAP is loaded before your notification script
2. **Notifications not showing**: Check z-index values and console for errors
3. **Styling issues**: Verify CSS is properly linked and not being overridden

### Debug Mode

Add this to enable console logging:

```javascript
// Add to the show() method
console.log('Showing notification:', { type, title, message, duration });
```

This notification system provides a modern, professional toast notification solution that can be easily integrated into any project. The combination of GSAP animations, glassmorphism design, and responsive behavior creates an excellent user experience.