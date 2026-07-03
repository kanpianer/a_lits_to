import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetBlock = `        <motion.div
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
        </motion.div>`;

const replacementBlock = `        <motion.div
          initial={false}
          animate={{ height: (isExpanded || isEditing) ? "auto" : "22px" }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="overflow-hidden relative w-full"
        >
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full bg-transparent outline-none border-none text-[14px] sm:text-[15px] leading-[22px] text-natural-ink resize-none overflow-hidden"
              rows={Math.max(1, editText.split('\\n').length)}
              style={{ minHeight: '22px' }}
            />
          ) : (
            <div onDoubleClick={() => setIsEditing(true)}>
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
                    "text-[14px] sm:text-[15px] leading-[22px] transition-colors duration-150 break-words whitespace-pre-wrap line-clamp-1 select-none",
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
                    "text-[14px] sm:text-[15px] leading-[22px] transition-colors duration-150 break-words whitespace-pre-wrap select-none",
                    item.checked
                      ? "text-natural-ink line-through opacity-40"
                      : "text-natural-ink",
                  )}
                >
                  {item.text}
                </p>
              </div>
            </div>
          )}
        </motion.div>`;

content = content.replace(targetBlock, replacementBlock);
fs.writeFileSync('src/App.tsx', content);
