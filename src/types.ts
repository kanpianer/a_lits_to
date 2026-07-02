export interface TaskItem {
  id: string;
  text: string;
  checked: boolean;
  checkedColorIndex?: number;
}

export interface ClientConnection {
  socketId: string;
  colorIndex: number;
}

export interface TaskList {
  id: string;
  title: string;
  items: TaskItem[];
  createdAt: number;
  connections?: ClientConnection[];
}
