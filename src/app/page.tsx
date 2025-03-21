'use client'

import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'

// Task type definition
type Task = {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'done' | 'failed' | 'in-progress'
  timestamp?: string
}

// Priority Badge component
const PriorityBadge = ({ priority }: { priority: 'low' | 'medium' | 'high' }) => {
  const bgColor = 
    priority === 'high' ? 'bg-red-100 text-red-800' : 
    priority === 'medium' ? 'bg-orange-100 text-orange-800' : 
    'bg-green-100 text-green-800';
  
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${bgColor}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
};

// Priority Select component to reuse in forms
const PrioritySelect = ({ 
  value, 
  onChange 
}: { 
  value: 'low' | 'medium' | 'high',
  onChange: (value: 'low' | 'medium' | 'high') => void
}) => {
  // Get background color based on priority
  const getBgColor = () => {
    if (value === 'high') return 'bg-red-50 border-red-300';
    if (value === 'medium') return 'bg-orange-50 border-orange-300';
    return 'bg-green-50 border-green-300';
  };
  
  // Get text color based on priority
  const getTextColor = () => {
    if (value === 'high') return 'text-red-800';
    if (value === 'medium') return 'text-orange-800';
    return 'text-green-800';
  };
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'low' | 'medium' | 'high')}
      className={`p-1 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 ${getBgColor()} ${getTextColor()}`}
    >
      <option value="low" className="bg-white text-green-800">Low</option>
      <option value="medium" className="bg-white text-orange-800">Medium</option>
      <option value="high" className="bg-white text-red-800">High</option>
    </select>
  );
};

// Task item component
const TaskItem = ({ task, onDelete }: { task: Task, onDelete: (id: string) => void }) => {
  // Track if we're hovering over the delete button
  const [isDeleteHover, setIsDeleteHover] = useState(false);
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id,
    disabled: isDeleteHover
  })
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    width: '100%',
    position: 'relative' as const
  }
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="bg-white p-3 rounded-lg shadow-sm mb-3 border border-gray-100 cursor-grab"
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-800">{task.title}</h3>
        <div 
          onClick={() => onDelete(task.id)}
          onMouseEnter={() => setIsDeleteHover(true)}
          onMouseLeave={() => setIsDeleteHover(false)}
          onTouchStart={() => setIsDeleteHover(true)}
          onTouchEnd={() => setIsDeleteHover(false)}
          className="text-gray-400 hover:text-red-500 text-lg cursor-pointer px-2 py-1"
        >
          ×
        </div>
      </div>

      {task.description && <p className="text-sm text-gray-600 mt-2 mb-3">{task.description}</p>}

      <div className="flex justify-between items-center mt-3">
        <PriorityBadge priority={task.priority} />
        
        {task.timestamp && (
          <span className="text-xs text-gray-500">
            {task.timestamp}
          </span>
        )}
      </div>
    </div>
  )
}

// Editable Task Item component
const EditableTaskItem = ({ 
  status,
  onSave,
  onCancel
}: { 
  status: 'todo' | 'done' | 'failed' | 'in-progress',
  onSave: (task: Omit<Task, 'id' | 'timestamp'>) => void,
  onCancel: () => void
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    
    onSave({
      title,
      description,
      priority,
      status
    })
  }

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm mb-3 border border-gray-100">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full font-medium text-gray-800 mb-2 focus:outline-none focus:ring-0 border-0 p-0 text-base"
          placeholder="Task title"
          required
          autoFocus
        />
        
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full text-sm text-gray-600 mb-3 focus:outline-none focus:ring-0 border-0 p-0 resize-none"
          rows={2}
          placeholder="Add a description..."
        />
        
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <PrioritySelect value={priority} onChange={setPriority} />
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

// Column component
const Column = ({ 
  title, 
  tasks, 
  onDelete, 
  onAddTask,
  id,
  isEditing,
  onSaveTask
}: { 
  title: string, 
  tasks: Task[], 
  onDelete: (id: string) => void,
  onAddTask: (status: 'todo' | 'done' | 'failed' | 'in-progress' | null) => void,
  id: string,
  isEditing: boolean,
  onSaveTask: (task: Omit<Task, 'id' | 'timestamp'>) => void
}) => {
  const { setNodeRef } = useDroppable({
    id: id
  });

  // Color based on column type
  const headerColor = 
    id === 'todo' ? 'border-blue-500' : 
    id === 'done' ? 'border-green-500' : 
    id === 'in-progress' ? 'border-orange-500' :
    'border-red-500';

  return (
    <div ref={setNodeRef} className="bg-gray-50 rounded-xl shadow-sm overflow-hidden w-full min-h-[200px] flex flex-col">
      <div className={`p-4 bg-white border-t-4 ${headerColor}`}>
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-700">{title}</h2>
          <span className="bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div className="p-3 flex-grow overflow-y-auto" style={{ maxHeight: '60vh' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} onDelete={onDelete} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isEditing && (
          <div className="text-center py-8 text-gray-400">
            No tasks here
          </div>
        )}
        
        {!isEditing && (
          <button 
            className="w-full mt-2 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center text-sm"
            onClick={() => onAddTask(id as 'todo' | 'done' | 'in-progress')}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            New
          </button>
        )}

        {isEditing && (
          <EditableTaskItem 
            status={id as 'todo' | 'done' | 'in-progress'}
            onSave={task => {
              const statusToUse = id as 'todo' | 'done' | 'in-progress';
              onSaveTask({
                ...task,
                status: statusToUse
              });
            }}
            onCancel={() => onAddTask(null)}
          />
        )}
      </div>
    </div>
  )
}

export default function TaskDashboard() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Hey, everyone! Let\'s get started on the Case Study Project AI Dashboard', description: 'Our first task is to gather requirements.', priority: 'low', status: 'todo', timestamp: 'Jun 26, 14:30' },
    { id: '2', title: 'Task: Research AI dashboards & gather case studies', description: 'Look at competitors and best practices', priority: 'medium', status: 'todo', timestamp: 'Jun 20, 10:15' },
    { id: '3', title: 'Start compile a list of relevant dashboards and case studies', description: 'Focus on UX/UI best practices', priority: 'low', status: 'todo', timestamp: 'Jun 26, 09:45' },
    { id: '4', title: 'Great progress, team! 🙌 We\'ve gathered the data, and now we can start drafting the case study', description: 'Time to organize findings', priority: 'high', status: 'in-progress', timestamp: 'Jun 10, 16:20' },
    { id: '5', title: 'The case study report is now finalized and ready for presentation 🎯', description: 'Final review completed', priority: 'high', status: 'done', timestamp: 'Jun 26, 11:05' },
  ])
  
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<'todo' | 'done' | 'failed' | 'in-progress' | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Function to find container for a task
  const findContainer = (id: string) => {
    const task = tasks.find(task => task.id === id);
    return task ? task.status : null;
  }

  const handleDragStart = (event: DragEndEvent) => {
    const { active } = event;
    setActiveId(active.id.toString());
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    // Find the containers
    const activeContainer = findContainer(activeId.toString());
    const overContainer = over.id === 'todo' || over.id === 'done' || over.id === 'failed' || over.id === 'in-progress'
      ? over.id.toString() 
      : findContainer(overId.toString());
    
    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }
    
    setTasks(tasks => {
      const updatedTasks = [...tasks];
      const taskToMove = updatedTasks.find(task => task.id === activeId);
      
      if (taskToMove) {
        taskToMove.status = overContainer as 'todo' | 'done' | 'failed' | 'in-progress';
      }
      
      return updatedTasks;
    });
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }
    
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    // Find the containers
    const activeContainer = findContainer(activeId);
    const overContainer = over.id === 'todo' || over.id === 'done' || over.id === 'failed' || over.id === 'in-progress'
      ? over.id.toString() 
      : findContainer(overId);
    
    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    if (activeContainer !== overContainer) {
      // Moving to a different container
      setTasks(tasks => {
        const updatedTasks = [...tasks];
        const taskToUpdate = updatedTasks.find(task => task.id === activeId);
        
        if (taskToUpdate) {
          taskToUpdate.status = overContainer as 'todo' | 'done' | 'failed' | 'in-progress';
        }
        
        return updatedTasks;
      });
    } else {
      // Moving within the same container
      const activeIndex = tasks.findIndex(task => task.id === activeId);
      const overIndex = tasks.findIndex(task => task.id === overId);
      
      if (activeIndex !== overIndex) {
        setTasks(tasks => arrayMove(tasks, activeIndex, overIndex));
      }
    }
    
    setActiveId(null);
  }

  const handleDelete = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id))
  }

  const todoTasks = tasks.filter(task => task.status === 'todo')
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress')
  const doneTasks = tasks.filter(task => task.status === 'done')

  const handleSaveNewTask = (taskData: Omit<Task, 'id' | 'timestamp'>) => {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' });
    const day = now.getDate();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    const timestamp = `${month} ${day}, ${hours}:${minutes}`;
    
    const newTask: Task = {
      id: Date.now().toString(),
      ...taskData,
      timestamp
    }
    
    setTasks([...tasks, newTask])
    setEditingStatus(null)
  }

  return (
    <div className="min-h-screen bg-white p-6 md:p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
        <span className="text-blue-500 mr-2">📝</span> To-Do List
      </h1>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Column 
            id="todo" 
            title="Planning" 
            tasks={todoTasks} 
            onDelete={handleDelete}
            onAddTask={setEditingStatus}
            isEditing={editingStatus === 'todo'}
            onSaveTask={handleSaveNewTask}
          />
          
          <Column 
            id="in-progress" 
            title="In Progress" 
            tasks={inProgressTasks} 
            onDelete={handleDelete}
            onAddTask={setEditingStatus}
            isEditing={editingStatus === 'in-progress'}
            onSaveTask={handleSaveNewTask}
          />
          
          <Column 
            id="done" 
            title="Done" 
            tasks={doneTasks} 
            onDelete={handleDelete}
            onAddTask={setEditingStatus}
            isEditing={editingStatus === 'done'}
            onSaveTask={handleSaveNewTask}
          />
        </div>
        
        {typeof document !== 'undefined' && createPortal(
          <DragOverlay adjustScale={false} className="w-[calc(100%/3-1rem)]">
            {activeId ? renderTaskOverlay(activeId, tasks) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  )
}

// Function to render a draggable task item for the drag overlay
const renderTaskOverlay = (id: string, tasks: Task[]) => {
  const task = tasks.find(task => task.id === id);
  if (!task) return null;
  
  return (
    <div 
      className="bg-white p-3 rounded-lg shadow-lg border border-gray-200"
      style={{
        width: 'calc(100% - 32px)',
        maxWidth: '100%'
      }}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium text-gray-800">{task.title}</h3>
      </div>

      {task.description && <p className="text-sm text-gray-600 mt-2 mb-3">{task.description}</p>}

      <div className="flex justify-between items-center mt-3">
        <PriorityBadge priority={task.priority} />
        
        {task.timestamp && (
          <span className="text-xs text-gray-500">
            {task.timestamp}
          </span>
        )}
      </div>
    </div>
  );
};
