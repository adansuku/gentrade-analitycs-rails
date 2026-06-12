export function EditorToolbar({ editor }) {
  if (!editor) return null;

  const Btn = ({ onClick, active, title, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`editor-toolbar-btn ${active ? 'active' : ''}`}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );

  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-group">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita">
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva">
          <em>I</em>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </Btn>
      </div>
      <div className="editor-toolbar-separator" />
      <div className="editor-toolbar-group">
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Titulo 1">
          H1
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Titulo 2">
          H2
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Titulo 3">
          H3
        </Btn>
      </div>
      <div className="editor-toolbar-separator" />
      <div className="editor-toolbar-group">
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
          &bull;
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          1.
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Cita">
          &ldquo;
        </Btn>
      </div>
      <div className="editor-toolbar-separator" />
      <div className="editor-toolbar-group">
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinear izquierda">
          &#8676;
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrar">
          &#8596;
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinear derecha">
          &#8677;
        </Btn>
      </div>
      <div className="editor-toolbar-separator" />
      <div className="editor-toolbar-group">
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linea separadora">
          &mdash;
        </Btn>
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
          &#8617;
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
          &#8618;
        </Btn>
      </div>
    </div>
  );
}

export default EditorToolbar;
