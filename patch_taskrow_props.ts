import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const taskRowPropsReplacement = `
interface TaskRowProps {
  item: TaskItem;
  isExpanded: boolean;
  isCompleted: boolean;
  handleToggleTask: (id: string, checked: boolean) => void;
  handleUpdateTaskText: (id: string, text: string) => void;
  toggleExpand: (id: string) => void;
  setItemToDelete: (id: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  item,
  isExpanded,
  isCompleted,
  handleToggleTask,
  handleUpdateTaskText,
  toggleExpand,
  setItemToDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  useEffect(() => {
    setEditText(item.text);
  }, [item.text]);

  const handleEditSubmit = () => {
    if (editText.trim() && editText !== item.text) {
      handleUpdateTaskText(item.id, editText.trim());
    } else {
      setEditText(item.text);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  const dragControls = useDragControls();
`;

content = content.replace(/interface TaskRowProps \{[\s\S]*?const dragControls = useDragControls\(\);/, taskRowPropsReplacement.trim());

fs.writeFileSync('src/App.tsx', content);
