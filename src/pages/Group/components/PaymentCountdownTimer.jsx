// Payment Countdown Timer Component - FIXED for Firebase Timestamps
const PaymentCountdownTimer = ({ deadline, requestId, onRequestUpdate, currentUserId }) => {
    const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = async () => {
            console.log('PaymentCountdownTimer - Raw deadline:', deadline);

            if (!deadline) {
                console.warn('PaymentCountdownTimer - No deadline provided');
                setIsExpired(true);
                return;
            }

            let deadlineTime;

            try {
                // Handle different deadline formats
                if (deadline.toDate && typeof deadline.toDate === 'function') {
                    // Firebase Timestamp object
                    deadlineTime = deadline.toDate().getTime();
                    console.log('PaymentCountdownTimer - Firebase Timestamp converted:', new Date(deadlineTime));
                } else if (deadline.seconds) {
                    // Firebase Timestamp-like object with seconds
                    deadlineTime = deadline.seconds * 1000;
                    console.log('PaymentCountdownTimer - Seconds format converted:', new Date(deadlineTime));
                } else if (typeof deadline === 'string' || typeof deadline === 'number') {
                    // String or number timestamp
                    deadlineTime = new Date(deadline).getTime();
                    console.log('PaymentCountdownTimer - String/Number converted:', new Date(deadlineTime));
                } else if (deadline instanceof Date) {
                    // Already a Date object
                    deadlineTime = deadline.getTime();
                    console.log('PaymentCountdownTimer - Date object:', deadline);
                } else {
                    throw new Error('Invalid deadline format');
                }

                const now = new Date().getTime();
                const difference = deadlineTime - now;

                console.log('PaymentCountdownTimer - Time calculation:', {
                    now: new Date(now),
                    deadline: new Date(deadlineTime),
                    difference: difference,
                    differenceInMinutes: Math.floor(difference / (1000 * 60))
                });

                if (difference > 0) {
                    const hours = Math.floor(difference / (1000 * 60 * 60));
                    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

                    setTimeLeft({ hours, minutes, seconds });
                    setIsExpired(false);

                    console.log('PaymentCountdownTimer - Time left:', { hours, minutes, seconds });
                } else {
                    console.log('PaymentCountdownTimer - Timer expired, transitioning to paid');
                    setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                    setIsExpired(true);

                    // Auto-transition to 'paid' state when funding timer expires
                    if (onRequestUpdate && requestId) {
                        try {
                            const result = await groupRequestService.updateGroupRequest(requestId, {
                                status: 'paid',
                                updatedAt: new Date(),
                                fundingExpiredAt: new Date()
                            }, currentUserId);

                            if (result.success) {
                                onRequestUpdate(requestId, {
                                    status: 'paid',
                                    fundingExpiredAt: new Date()
                                });
                            }
                        } catch (error) {
                            console.error('Error updating request status to paid:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('PaymentCountdownTimer - Error parsing deadline:', error);
                setIsExpired(true);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [deadline, requestId, onRequestUpdate, currentUserId]);

    if (isExpired) {
        return (
            <div className="text-xs text-green-600 font-medium">
                ✅ Payment deadline reached - Session is now ready!
            </div>
        );
    }

    return (
        <div className="text-2xl font-mono font-bold text-red-700 bg-red-50 px-4 py-2 rounded-lg border-2 border-red-300">
            {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>
    );
};