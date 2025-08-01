// Modern Hotel Notification System
// A reusable notification system built with GSAP for hotel management app

import { gsap } from 'gsap';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

class HotelNotification {
    private container: HTMLElement | null = null;
    private notification: HTMLElement | null = null;
    private progressBar: HTMLElement | null = null;
    private activeNotifications: Array<{
        container: HTMLElement;
        height: number;
        timeline: gsap.core.Timeline;
    }> = [];
    private notificationGap = 12;
    private lastNotificationTime: Map<string, number> = new Map();
    private debounceDelay = 2000; // 2 seconds debounce

    constructor() {
        this.createNotificationContainer();
    }

    private createNotificationContainer() {
        // Check if container already exists
        if (document.getElementById('hotelNotificationContainer')) {
            this.container = document.getElementById('hotelNotificationContainer');
            this.notification = this.container?.querySelector('.hotel-notification') as HTMLElement;
            this.progressBar = this.notification?.querySelector('.hotel-notification-progress-bar') as HTMLElement;
            return;
        }

        // Create container and add to body
        const container = document.createElement('div');
        container.id = 'hotelNotificationContainer';
        container.className = 'hotel-notification-container';
        
        container.innerHTML = `
            <div class="hotel-notification">
                <div class="hotel-notification-content">
                    <div class="hotel-notification-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="none" d="M0 0h24v24H0z"/>
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>
                        </svg>
                    </div>
                    <div class="hotel-notification-text">
                        <h3>Success!</h3>
                        <p>Your action has been completed successfully.</p>
                    </div>
                    <button class="hotel-notification-close" aria-label="Close notification">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="none" d="M0 0h24v24H0z"/>
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <div class="hotel-notification-progress">
                    <div class="hotel-notification-progress-bar"></div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        
        // Apply styles programmatically for better integration
        this.applyStyles();
        
        this.container = container;
        this.notification = container.querySelector('.hotel-notification') as HTMLElement;
        this.progressBar = this.notification.querySelector('.hotel-notification-progress-bar') as HTMLElement;
    }

    private applyStyles() {
        // Check if styles already applied
        if (document.getElementById('hotelNotificationStyles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'hotelNotificationStyles';
        style.textContent = `
            /* Hotel Notification Container */
            .hotel-notification-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                visibility: hidden;
            }

            @media (max-width: 768px) {
                .hotel-notification-container {
                    bottom: 10px;
                    right: 10px;
                    left: 10px;
                }
            }

            /* Hotel Notification Card - Light Theme */
            .hotel-notification {
                width: 380px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05);
                position: relative;
                pointer-events: auto;
                overflow: hidden;
                border: 1px solid rgba(0, 0, 0, 0.08);
                border-left: 4px solid #10B981;
                margin-bottom: 12px;
            }

            @media (max-width: 768px) {
                .hotel-notification {
                    width: 100%;
                    max-width: 360px;
                    margin: 0 auto 12px auto;
                }
            }

            /* Hotel Notification Content */
            .hotel-notification-content {
                display: flex;
                padding: 16px 20px;
                align-items: flex-start;
                width: 100%;
                position: relative;
            }

            .hotel-notification-icon {
                width: 24px;
                height: 24px;
                color: #10B981;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .hotel-notification-text {
                flex-grow: 1;
                margin-right: 12px;
            }

            .hotel-notification-content h3 {
                margin: 0 0 4px 0;
                font-size: 15px;
                color: #1F2937;
                font-weight: 600;
                line-height: 1.3;
            }

            .hotel-notification-content p {
                margin: 0;
                font-size: 14px;
                color: #6B7280;
                line-height: 1.4;
            }

            /* Close Button */
            .hotel-notification-close {
                background: none;
                border: none;
                color: #9CA3AF;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }

            .hotel-notification-close:hover {
                color: #6B7280;
                background-color: rgba(0, 0, 0, 0.05);
            }

            /* Progress Bar */
            .hotel-notification-progress {
                height: 3px;
                width: 100%;
                background-color: rgba(0, 0, 0, 0.05);
                overflow: hidden;
                position: absolute;
                bottom: 0;
                left: 0;
            }

            .hotel-notification-progress-bar {
                height: 100%;
                width: 100%;
                background-color: #10B981;
                transform-origin: left center;
                transform: scaleX(0);
            }

            /* Success notification styles */
            .hotel-notification.success {
                border-left-color: #10B981;
            }

            .hotel-notification.success .hotel-notification-icon {
                color: #10B981;
            }

            .hotel-notification.success .hotel-notification-progress-bar {
                background-color: #10B981;
            }

            /* Error notification styles */
            .hotel-notification.error {
                border-left-color: #EF4444;
            }

            .hotel-notification.error .hotel-notification-icon {
                color: #EF4444;
            }

            .hotel-notification.error .hotel-notification-progress-bar {
                background-color: #EF4444;
            }

            /* Info notification styles */
            .hotel-notification.info {
                border-left-color: #3B82F6;
            }

            .hotel-notification.info .hotel-notification-icon {
                color: #3B82F6;
            }

            .hotel-notification.info .hotel-notification-progress-bar {
                background-color: #3B82F6;
            }

            /* Warning notification styles */
            .hotel-notification.warning {
                border-left-color: #F59E0B;
            }

            .hotel-notification.warning .hotel-notification-icon {
                color: #F59E0B;
            }

            .hotel-notification.warning .hotel-notification-progress-bar {
                background-color: #F59E0B;
            }

            /* Responsive Design */
            @media (max-width: 480px) {
                .hotel-notification {
                    width: 100%;
                    margin: 0 0 12px 0;
                }

                .hotel-notification-content {
                    padding: 14px 16px;
                }

                .hotel-notification-content h3 {
                    font-size: 14px;
                }

                .hotel-notification-content p {
                    font-size: 13px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Show a notification
     * @param type - Type of notification: 'success', 'error', 'info', or 'warning'
     * @param title - Title of the notification
     * @param message - Message to display
     * @param duration - Duration in seconds before notification disappears
     * @returns The GSAP timeline for the animation
     */
    show(type: NotificationType = 'success', title: string = 'Success!', message: string = 'Your action has been completed successfully.', duration: number = 4): gsap.core.Timeline | null {
        // Create a unique key for this notification
        const notificationKey = `${type}-${title}`;
        const now = Date.now();
        const lastTime = this.lastNotificationTime.get(notificationKey) || 0;
        
        // If the same notification was shown recently, skip it
        if (now - lastTime < this.debounceDelay) {
            console.log(`Notification debounced: ${title}`);
            return null;
        }
        
        // Update last notification time
        this.lastNotificationTime.set(notificationKey, now);
        // Create a new notification for stacking
        const notificationContainer = this.createStackedNotification(type, title, message, duration);
        
        return this.animateNotification(notificationContainer, duration);
    }

    private createStackedNotification(type: NotificationType, title: string, message: string, duration: number): HTMLElement {
        const container = document.createElement('div');
        container.className = 'hotel-notification-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1000';
        container.style.opacity = '0';
        container.style.visibility = 'hidden';
        container.style.pointerEvents = 'none';

        const notification = document.createElement('div');
        notification.className = `hotel-notification ${type}`;
        
        // Update icon based on type
        let iconSvg = '';
        switch (type) {
            case 'success':
                iconSvg = `<path fill="none" d="M0 0h24v24H0z"/><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" fill="currentColor"/>`;
                break;
            case 'error':
                iconSvg = `<path fill="none" d="M0 0h24v24H0z"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>`;
                break;
            case 'info':
                iconSvg = `<path fill="none" d="M0 0h24v24H0z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>`;
                break;
            case 'warning':
                iconSvg = `<path fill="none" d="M0 0h24v24H0z"/><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2zm0 4.15L9.85 8.5 7.22 8.95l2.28 2.23-.54 3.18L12 13.13l3.04 1.23-.54-3.18 2.28-2.23-2.63-.45L12 6.15z" fill="currentColor"/>`;
                break;
        }

        notification.innerHTML = `
            <div class="hotel-notification-content">
                <div class="hotel-notification-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        ${iconSvg}
                    </svg>
                </div>
                <div class="hotel-notification-text">
                    <h3>${title}</h3>
                    <p>${message}</p>
                </div>
                <button class="hotel-notification-close" aria-label="Close notification">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="none" d="M0 0h24v24H0z"/>
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
            <div class="hotel-notification-progress">
                <div class="hotel-notification-progress-bar"></div>
            </div>
        `;

        container.appendChild(notification);
        document.body.appendChild(container);

        // Apply styles if not already applied
        this.applyStyles();

        return container;
    }

    private animateNotification(notificationContainer: HTMLElement, duration: number): gsap.core.Timeline {
        const notification = notificationContainer.querySelector('.hotel-notification') as HTMLElement;
        const progressBar = notification.querySelector('.hotel-notification-progress-bar') as HTMLElement;
        const closeButton = notification.querySelector('.hotel-notification-close') as HTMLElement;

        // Add to active notifications
        const notificationObj = {
            container: notificationContainer,
            height: 0,
            timeline: gsap.timeline()
        };
        this.activeNotifications.push(notificationObj);

        // Position notifications
        this.positionNotifications();

        // Create timeline
        const tl = gsap.timeline({
            onComplete: () => {
                // Remove from active notifications
                const index = this.activeNotifications.findIndex(n => n.container === notificationContainer);
                if (index !== -1) {
                    this.activeNotifications.splice(index, 1);
                }

                // Remove DOM element
                if (document.body.contains(notificationContainer)) {
                    document.body.removeChild(notificationContainer);
                }

                // Reposition remaining notifications
                this.positionNotifications();
            }
        });

        notificationObj.timeline = tl;

        // Show container
        tl.set(notificationContainer, {
            visibility: 'visible',
            pointerEvents: 'auto'
        });

        // Animate in
        tl.fromTo(notificationContainer, {
            opacity: 0,
            x: 30,
            scale: 0.95
        }, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.4,
            ease: 'back.out(1.2)',
            onComplete: () => {
                // Set height after animation
                notificationObj.height = notificationContainer.offsetHeight;
                this.positionNotifications();
            }
        });

        // Animate icon
        tl.fromTo(notification.querySelector('.hotel-notification-icon'), {
            scale: 0,
            rotation: -180
        }, {
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: 'back.out(2)'
        }, '-=0.2');

        // Animate progress bar
        tl.fromTo(progressBar, {
            scaleX: 0
        }, {
            scaleX: 1,
            duration: duration,
            ease: 'none'
        }, '<');

        // Animate out
        tl.to(notificationContainer, {
            opacity: 0,
            x: 50,
            scale: 0.95,
            duration: 0.3,
            ease: 'power2.in'
        });

        // Close button handler
        closeButton.addEventListener('click', () => {
            tl.progress(1);
        });

        return tl;
    }

    private positionNotifications() {
        let currentOffset = 0;

        // Position from bottom to top (reverse order for stacking upwards)
        for (let i = this.activeNotifications.length - 1; i >= 0; i--) {
            const notification = this.activeNotifications[i];
            gsap.to(notification.container, {
                y: -currentOffset,
                duration: 0.3,
                ease: 'power2.out'
            });

            const height = notification.height || 80;
            currentOffset += height + this.notificationGap;
        }
    }

    /**
     * Show a success notification
     */
    success(title: string = 'Success!', message: string = 'Your action has been completed successfully.', duration: number = 4): gsap.core.Timeline | null {
        return this.show('success', title, message, duration);
    }

    /**
     * Show an error notification
     */
    error(title: string = 'Error!', message: string = 'Something went wrong. Please try again.', duration: number = 5): gsap.core.Timeline | null {
        return this.show('error', title, message, duration);
    }

    /**
     * Show an info notification
     */
    info(title: string = 'Information', message: string = 'Here is some important information for you.', duration: number = 4): gsap.core.Timeline | null {
        return this.show('info', title, message, duration);
    }

    /**
     * Show a warning notification
     */
    warning(title: string = 'Warning', message: string = 'Please pay attention to this information.', duration: number = 5): gsap.core.Timeline | null {
        return this.show('warning', title, message, duration);
    }
}

// Create a global instance
const hotelNotification = new HotelNotification();

// Export the notification system
export default hotelNotification;