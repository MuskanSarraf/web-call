export type Message = {
  id: number;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
};

export type SendMessageInput = {
  receiverId: string;
  message: string;
};