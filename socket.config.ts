// Store connected users
let users: { [key: string]: string } = {};

export function setupSocket(io: any) {
  io.on('connection', (socket: any) => {
    console.log('A user connected:', socket.id);

    socket.on('register', (userId: string) => {
      users[userId] = socket.id;
      socket.userId = userId;
      console.log('User registered:', userId);
    });

    socket.on('signal', (data: any) => {
      const recipientSocketId = users[data.to];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('signal', data);
        console.log(`Forwarded signal to: ${data.to}`);
      } else {
        console.log(`Recipient not found for: ${data.to}`);
      }
    });

    socket.on('message', (data: any) => {
      const recipientSocketId = users[data.to];
      io.to(recipientSocketId).emit('message', data);
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.userId);
      delete users[socket.userId];
    });
  });
}
