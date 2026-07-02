/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { io, Socket } from "socket.io-client";
import { TaskList, TaskItem } from "./types";
import {
  motion,
  AnimatePresence,
  Reorder,
  useDragControls,
} from "motion/react";
import { Check, Copy, Trash2, Plus, X, Sun, Moon } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function playTickSound() {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore audio errors
  }
}

const CHECK_COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#4CD964",
  "#5AC8FA",
  "#007AFF",
  "#5856D6",
  "#FF2D55",
  "#E57373",
  "#81C784",
  "#64B5F6",
  "#BA68C8",
  "#F06292",
  "#4DB6AC",
  "#AED581",
];

interface TaskRowProps {
  item: TaskItem;
  isExpanded: boolean;
  isCompleted: boolean;
  handleToggleTask: (id: string, checked: boolean) => void;
  toggleExpand: (id: string) => void;
  setItemToDelete: (id: string) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({
  item,
  isExpanded,
  isCompleted,
  handleToggleTask,
  toggleExpand,
  setItemToDelete,
}) => {
  const dragControls = useDragControls();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const startDrag = (e: React.PointerEvent) => {
    touchStartPos.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      dragControls.start(e);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 300);
  };

  const cancelDrag = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (touchStartPos.current && timerRef.current) {
      const dx = Math.abs(e.clientX - touchStartPos.current.x);
      const dy = Math.abs(e.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        cancelDrag();
      }
    }
  };

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onPointerDown={startDrag}
      onPointerUp={cancelDrag}
      onPointerCancel={cancelDrag}
      onPointerMove={onPointerMove}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: "none",
        backgroundColor: "",
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="group relative flex items-start gap-1.5 sm:gap-2 p-1 mb-1 sm:mb-1.5 hover:bg-natural-surface rounded-[8px] sm:rounded-[10px] transition-colors border-b border-natural-border active:cursor-grabbing select-none no-select"
      whileDrag={{
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        backgroundColor: "var(--color-natural-surface)",
      }}
      style={{ position: "relative" }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleTask(item.id, item.checked);
        }}
        className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 ring-natural-ink ring-offset-2 transition-transform active:scale-90"
        aria-label={item.checked ? "Uncheck task" : "Check task"}
      >
        <div
          className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-[7px] sm:rounded-[8px] border-[2px] flex items-center justify-center transition-all duration-300",
            item.checked
              ? isCompleted
                ? "bg-gray-400 border-gray-400 dark:bg-gray-600 dark:border-gray-600"
                : ""
              : "border-natural-border bg-natural-bg",
          )}
          style={{
            backgroundColor: item.checked && !isCompleted ? (item.checkedColorIndex !== undefined ? CHECK_COLORS[item.checkedColorIndex % 15] : "var(--color-natural-accent)") : undefined,
            borderColor: item.checked && !isCompleted ? (item.checkedColorIndex !== undefined ? CHECK_COLORS[item.checkedColorIndex % 15] : "var(--color-natural-accent)") : undefined,
          }}
        >
          <Check
            className={cn(
              "w-3.5 h-3.5 sm:w-4 sm:h-4 text-white transition-opacity duration-300",
              item.checked ? "opacity-100" : "opacity-0",
            )}
            strokeWidth={3}
          />
        </div>
      </button>

      <div
        onClick={(e) => {
          e.stopPropagation();
          toggleExpand(item.id);
        }}
        className="flex-grow py-[9px] px-0.5 cursor-pointer"
      >
        <motion.div
          initial={false}
          animate={{ height: isExpanded ? "auto" : "22px" }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="overflow-hidden relative w-full"
        >
          {/* Clamped version (visible when collapsed) */}
          <div
            className={cn(
              "absolute top-0 left-0 right-0 transition-opacity duration-150",
              isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            aria-hidden="true"
          >
            <p
              className={cn(
                "text-[14px] sm:text-[15px] leading-[22px] transition-colors duration-150 break-words whitespace-pre-wrap line-clamp-1",
                item.checked
                  ? "text-natural-ink line-through opacity-40"
                  : "text-natural-ink",
              )}
            >
              {item.text}
            </p>
          </div>

          {/* Full version */}
          <div
            className={cn(
              "transition-opacity duration-150",
              isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <p
              className={cn(
                "text-[14px] sm:text-[15px] leading-[22px] transition-colors duration-150 break-words whitespace-pre-wrap",
                item.checked
                  ? "text-natural-ink line-through opacity-40"
                  : "text-natural-ink",
              )}
            >
              {item.text}
            </p>
          </div>
        </motion.div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setItemToDelete(item.id);
        }}
        className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg text-natural-muted hover:text-[#E74C3C] hover:bg-[#FADBD8]/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all focus:outline-none focus:opacity-100"
        aria-label="Delete task"
      >
        <X className="w-4 h-4 sm:w-4 sm:h-4" />
      </button>
    </Reorder.Item>
  );
};

export default function App() {
  const [listId, setListId] = useState<string>("");
  const [list, setList] = useState<TaskList | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [titleInput, setTitleInput] = useState("");
  const [taskInput, setTaskInput] = useState("");

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showListDeletedPopup, setShowListDeletedPopup] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });
  const [now, setNow] = useState(Date.now());
  const isNewListRef = useRef(false);
  const myColorIndexRef = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Initialize List ID from URL or create a new one
  useEffect(() => {
    let id = window.location.pathname.substring(1);

    // If there is an old "?id=" parameter, migrate it to the path
    const searchParams = new URLSearchParams(window.location.search);
    const queryId = searchParams.get("id");
    if (queryId) {
      id = queryId;
    }

    if (!id || id.length < 3 || id.length > 8 || !/^[a-zA-Z0-9]+$/.test(id)) {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const length = Math.floor(Math.random() * 6) + 3;
      id = Array.from({ length })
        .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
        .join("");
      const newUrl = "/" + id;
      window.history.replaceState({ path: newUrl }, "", newUrl);
      isNewListRef.current = true;
    } else {
      id = id.toLowerCase();
      const newUrl = "/" + id;
      window.history.replaceState({ path: newUrl }, "", newUrl);
      isNewListRef.current = false;
    }
    setListId(id);
  }, []);

  // Initialize Socket
  useEffect(() => {
    if (!listId) return;

    // Determine the correct socket URL based on environment variables or current host
    // In AI Studio (Cloud Run), the socket needs to connect to the same host
    // Since we are running the Express server on the same origin, we can just use /
    const newSocket = io({
      transports: ["websocket", "polling"],
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      if (isNewListRef.current) {
        newSocket.emit("create_list", listId);
        isNewListRef.current = false;
      } else {
        newSocket.emit("join_list", listId);
      }
    });

    newSocket.on("list_not_found", () => {
      setShowListDeletedPopup(true);
    });

    newSocket.on("room_full", () => {
      setToastMessage("当前链接同时打开设备已达上限 (15台)，无法加入。");
      setTimeout(() => {
        setToastMessage(null);
      }, 3000);
    });

    newSocket.on("your_color_index", (colorIndex: number) => {
      myColorIndexRef.current = colorIndex;
    });

    newSocket.on("sync_state", (initialState: TaskList) => {
      setList(initialState);
      setTitleInput(initialState.title);
    });

    newSocket.on("title_updated", (newTitle: string) => {
      setTitleInput(newTitle);
      setList((prev) => (prev ? { ...prev, title: newTitle } : prev));
    });

    newSocket.on("item_added", (item: TaskItem) => {
      setList((prev) => {
        if (!prev) return prev;
        if (prev.items.find((i) => i.id === item.id)) return prev;
        return { ...prev, items: [...prev.items, item] };
      });
    });

    newSocket.on(
      "item_toggled",
      ({ itemId, checked, checkedColorIndex }: { itemId: string; checked: boolean; checkedColorIndex?: number }) => {
        setList((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, checked, checkedColorIndex } : i,
            ),
          };
        });
      },
    );

    newSocket.on("items_reordered", (items: TaskItem[]) => {
      setList((prev) => {
        if (!prev) return prev;
        return { ...prev, items };
      });
    });

    newSocket.on("item_deleted", (itemId: string) => {
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((i) => i.id !== itemId),
        };
      });
    });

    newSocket.on("list_deleted", () => {
      setShowDeleteConfirm(false);
      setShowListDeletedPopup(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [listId]);

  // Check completion
  useEffect(() => {
    if (list && list.items.length > 0) {
      const allChecked = list.items.every((i) => i.checked);
      setIsCompleted(allChecked);
    } else {
      setIsCompleted(false);
    }
  }, [list]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitleInput(val);
    if (list && socket) {
      setList({ ...list, title: val });
      socket.emit("update_title", { listId, title: val });
    }
  };

  const handleAddTask = () => {
    if (!taskInput.trim() || !list || !socket) return;
    if (list.items.length >= 88) {
      showToast("任务数量已达上限 (88条)");
      return;
    }

    const text = taskInput.substring(0, 200).trim();
    const newItem: TaskItem = { id: uuidv4(), text, checked: false };

    // Optimistic update
    setList({ ...list, items: [...list.items, newItem] });
    setTaskInput("");

    socket.emit("add_item", { listId, item: newItem });
  };

  const handleToggleTask = (itemId: string, currentChecked: boolean) => {
    if (!list || !socket) return;
    const newChecked = !currentChecked;
    playTickSound();

    // Optimistic update
    setList({
      ...list,
      items: list.items.map((i) =>
        i.id === itemId ? { ...i, checked: newChecked, checkedColorIndex: newChecked ? myColorIndexRef.current : undefined } : i,
      ),
    });

    socket.emit("toggle_item", { listId, itemId, checked: newChecked });
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleReorder = (newItems: TaskItem[]) => {
    if (!list || !socket) return;
    // Optimistic update
    setList({ ...list, items: newItems });
    socket.emit("reorder_items", { listId, items: newItems });
  };

  const handleItemDelete = (itemId: string) => {
    if (!list || !socket) return;
    // Optimistic update
    setList({
      ...list,
      items: list.items.filter((i) => i.id !== itemId),
    });
    setItemToDelete(null);
    socket.emit("delete_item", { listId, itemId });
  };

  const handleDeleteList = () => {
    if (!socket || !listId) return;
    socket.emit("delete_list", { listId });
    setShowDeleteConfirm(false);
    setShowListDeletedPopup(true);
  };

  const handleCreateNewList = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const length = Math.floor(Math.random() * 6) + 3;
    const newId = Array.from({ length })
      .map(() => chars.charAt(Math.floor(Math.random() * chars.length)))
      .join("");
    const newUrl = "/" + newId;
    window.history.replaceState({ path: newUrl }, "", newUrl);
    isNewListRef.current = true;
    setListId(newId);
    setList(null);
    setShowListDeletedPopup(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("链接已复制");
    } catch (err) {
      showToast("复制失败");
    }
  };

  const handleInputFocus = () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.body.scrollTop = 0;
    }, 100);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      document.body.scrollTop = 0;
    }, 300);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const expiryText = useMemo(() => {
    if (!list) return "";
    const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
    const expiryDate = list.createdAt + FIFTEEN_DAYS;
    const diff = expiryDate - now;
    if (diff <= 0) return "任务已过期";

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days < 1) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const h = hours.toString().padStart(2, "0");
      const m = minutes.toString().padStart(2, "0");
      const s = seconds.toString().padStart(2, "0");
      return `${h}:${m}:${s} 后任务将自动销毁`;
    }
    return `${days}天后任务将自动销毁`;
  }, [list, now]);

  return (
    <div className="fixed inset-0 bg-natural-bg text-natural-ink font-sans selection:bg-natural-surface overflow-hidden flex flex-col transition-colors duration-300">
      {!list ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-natural-border border-t-natural-ink rounded-full animate-spin"></div>
        </div>
      ) : (
      <main className="w-full max-w-[680px] mx-auto px-4 sm:px-5 py-4 sm:py-6 flex flex-col h-full relative">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="absolute top-4 sm:top-6 right-4 sm:right-5 p-1.5 sm:p-2 rounded-full hover:bg-natural-surface text-natural-muted hover:text-natural-ink transition-colors z-20 scale-75"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Title Input */}
        <input
          type="text"
          value={titleInput}
          onChange={handleTitleChange}
          onFocus={handleInputFocus}
          placeholder="输入任务名称"
          className="font-serif italic text-[24px] sm:text-[28px] text-center w-full text-natural-ink bg-transparent border-none outline-none placeholder:opacity-20 mb-3 sm:mb-4 shrink-0"
        />

        {/* Task Entry Area */}
        <div className="relative mb-3 sm:mb-4 shrink-0 flex items-center">
          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value.substring(0, 200))}
            onFocus={handleInputFocus}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddTask();
              }
            }}
            placeholder="输入任务"
            rows={1}
            className="w-full bg-natural-surface border border-natural-border shadow-[0_4px_12px_rgba(0,0,0,0.02)] rounded-[10px] sm:rounded-[12px] pl-4 sm:pl-5 pr-[72px] sm:pr-[88px] py-3 sm:py-3.5 text-[16px] outline-none resize-none placeholder:opacity-40 leading-tight"
          />
          <button
            onClick={handleAddTask}
            disabled={!taskInput.trim()}
            className={cn(
              "absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-[8px] sm:rounded-[10px] font-medium transition-all duration-300 text-[13px] sm:text-[14px] text-[#000000] dark:text-white",
              taskInput.trim()
                ? "bg-white dark:bg-[#121212] cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
                : "bg-transparent cursor-not-allowed",
            )}
          >
            添加
          </button>
        </div>

        {/* Task List Container */}
        <div className="flex-1 relative min-h-0 flex flex-col mb-3 sm:mb-4 pr-1 sm:pr-2">
          <Reorder.Group
            axis="y"
            values={list.items}
            onReorder={handleReorder}
            className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
            layoutScroll
          >
            <AnimatePresence initial={false}>
              {list.items.map((item) => (
                <TaskRow
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems.has(item.id)}
                  isCompleted={isCompleted}
                  handleToggleTask={handleToggleTask}
                  toggleExpand={toggleExpand}
                  setItemToDelete={setItemToDelete}
                />
              ))}
            </AnimatePresence>
            {list.items.length === 0 && (
              <div className="flex flex-col items-center text-natural-muted text-[13px] sm:text-[14px] leading-[2] opacity-70 mt-12 sm:mt-16">
                <p>分享任务链接给他人</p>
                <p>可以多人协作编辑</p>
                <p>任务状态实时同步</p>
              </div>
            )}
          </Reorder.Group>

          <AnimatePresence>
            {isCompleted && list.items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-500/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg pointer-events-none z-10 font-medium tracking-wider"
              >
                任务已完成
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <footer className="flex justify-between items-center pt-4 sm:pt-5 shrink-0">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-transparent border border-[#E74C3C]/30 text-[#E74C3C] px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:bg-[#E74C3C]/10 active:scale-95 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            删除任务
          </button>

          <button
            onClick={handleCopyLink}
            className="bg-transparent border border-natural-border text-natural-ink px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:bg-natural-surface active:scale-95 transition-all"
          >
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            任务链接
          </button>
        </footer>

        <p className="text-[11px] sm:text-[12px] text-natural-muted text-center mt-3 sm:mt-4 tracking-[0.05em] uppercase shrink-0">
          {expiryText}
        </p>
      </main>
      )}

      {/* Item Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1c1c]/40 dark:bg-black/60 backdrop-blur-[4px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-natural-bg p-10 rounded-[24px] w-[340px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col items-center"
            >
              <h2 className="font-serif text-[24px] text-natural-ink mb-3">
                确定删除此任务？
              </h2>
              <div className="flex flex-col w-full gap-2.5 mt-4">
                <button
                  onClick={() => handleItemDelete(itemToDelete)}
                  className="w-full bg-[#E74C3C] text-white p-3.5 rounded-xl font-semibold cursor-pointer active:scale-95 transition-transform"
                >
                  确定
                </button>
                <button
                  onClick={() => setItemToDelete(null)}
                  className="w-full bg-natural-surface text-natural-ink p-3.5 rounded-xl font-semibold cursor-pointer active:scale-95 transition-transform"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1c1c]/40 dark:bg-black/60 backdrop-blur-[4px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-natural-bg p-10 rounded-[24px] w-[340px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col items-center"
            >
              <h2 className="font-serif text-[24px] text-natural-ink mb-3">
                删除此任务？
              </h2>
              <p className="text-natural-muted text-[15px] mb-6">
                此操作不可恢复，所有协作者将失去访问权限。
              </p>
              <div className="flex flex-col w-full gap-2.5">
                <button
                  onClick={handleDeleteList}
                  className="w-full bg-[#E74C3C] text-white p-3.5 rounded-xl font-semibold cursor-pointer active:scale-95 transition-transform"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full bg-natural-surface text-natural-ink p-3.5 rounded-xl font-semibold cursor-pointer active:scale-95 transition-transform"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* List Deleted Popup */}
      <AnimatePresence>
        {showListDeletedPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1c1c1c]/40 dark:bg-black/60 backdrop-blur-[4px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-natural-bg p-10 rounded-[24px] w-[340px] text-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col items-center"
            >
              <h2 className="font-serif text-[24px] text-natural-ink mb-6">
                任务不存在
              </h2>
              <button
                onClick={handleCreateNewList}
                className="w-full bg-natural-ink text-natural-bg p-3.5 rounded-xl font-semibold cursor-pointer active:scale-95 transition-transform"
              >
                创建新任务
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className="bg-natural-ink text-natural-bg py-3 px-6 rounded-xl text-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.2)] flex items-center gap-2 whitespace-nowrap"
            >
              <Check className="w-4 h-4 text-natural-bg" />
              {toastMessage}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
