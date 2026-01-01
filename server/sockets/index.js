// Socket.io event handlers
const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log(`📱 Client connected: ${socket.id}`);

        // Student joins order room for updates
        socket.on('join-order-room', ({ orderId }) => {
            socket.join(`order-${orderId}`);
            console.log(`Student joined order room: order-${orderId}`);
        });

        socket.on('leave-order-room', ({ orderId }) => {
            socket.leave(`order-${orderId}`);
            console.log(`Student left order room: order-${orderId}`);
        });

        // Outlet joins their room for new order notifications
        socket.on('join-outlet-room', ({ outletId }) => {
            socket.join(`outlet-${outletId}`);
            console.log(`Outlet joined room: outlet-${outletId}`);
        });

        socket.on('leave-outlet-room', ({ outletId }) => {
            socket.leave(`outlet-${outletId}`);
            console.log(`Outlet left room: outlet-${outletId}`);
        });

        // Timer sync request
        socket.on('request-timer-sync', async ({ orderId }) => {
            try {
                const Order = require('./models/Order');
                const order = await Order.findById(orderId);

                if (order && order.estimatedReadyAt) {
                    socket.emit('timer-sync', {
                        orderId,
                        remainingSeconds: order.remainingSeconds,
                        status: order.status
                    });
                }
            } catch (error) {
                console.error('Timer sync error:', error);
            }
        });

        socket.on('disconnect', () => {
            console.log(`📴 Client disconnected: ${socket.id}`);
        });
    });

    // Periodic timer sync for all active orders (every 30 seconds)
    setInterval(async () => {
        try {
            const Order = require('./models/Order');
            const activeOrders = await Order.find({
                status: { $in: ['accepted', 'preparing'] },
                timerStartedAt: { $exists: true }
            });

            activeOrders.forEach(order => {
                io.to(`order-${order._id}`).emit('timer-sync', {
                    orderId: order._id,
                    remainingSeconds: order.remainingSeconds,
                    status: order.status
                });
            });
        } catch (error) {
            // Silent fail for periodic sync
        }
    }, 30000);
};

module.exports = setupSocketHandlers;
