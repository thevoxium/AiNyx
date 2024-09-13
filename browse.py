import tkinter as tk
from tkinter import ttk
import os

class DirectorySelector:
    def __init__(self, parent):
        self.parent = parent
        self.result = None
        self.create_window()

    def create_window(self):
        self.top = tk.Toplevel(self.parent)
        self.top.title("Choose Directory")
        self.top.geometry("700x500")
        self.top.configure(bg='#1e1e1e')

        style = ttk.Style()
        style.theme_use('default')
        style.configure('TFrame', background='#1e1e1e')
        style.configure('TLabel', background='#1e1e1e', foreground='#d4d4d4')
        style.configure('TEntry', fieldbackground='#2d2d2d', foreground='#d4d4d4', insertcolor='#d4d4d4')
        style.configure('TButton', background='#0e639c', foreground='#ffffff', padding=10)
        style.map('TButton', background=[('active', '#1177bb')])
        style.configure('Treeview', 
                        background='#1e1e1e', 
                        fieldbackground='#1e1e1e', 
                        foreground='#d4d4d4')
        style.map('Treeview', background=[('selected', '#264f78')])
        style.configure('Treeview.Heading', background='#252526', foreground='#d4d4d4')

        main_frame = ttk.Frame(self.top, padding="20 20 20 20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        self.path_var = tk.StringVar()
        self.path_var.set(os.path.expanduser("~"))

        path_frame = ttk.Frame(main_frame)
        path_frame.pack(fill=tk.X, pady=(0, 20))

        ttk.Label(path_frame, text="Current Directory:").pack(side=tk.LEFT, padx=(0, 10))
        ttk.Entry(path_frame, textvariable=self.path_var, width=50).pack(side=tk.LEFT, expand=True, fill=tk.X)
        ttk.Button(path_frame, text="Browse", command=self.browse_button, style='TButton').pack(side=tk.RIGHT, padx=(10, 0))

        tree_frame = ttk.Frame(main_frame)
        tree_frame.pack(expand=True, fill=tk.BOTH)

        self.tree = ttk.Treeview(tree_frame, show='tree')
        self.tree.pack(side=tk.LEFT, expand=True, fill=tk.BOTH)
        self.tree.heading('#0', text='Directory Structure', anchor=tk.W)
        self.tree.bind('<<TreeviewOpen>>', self.update_tree)
        self.tree.bind('<Double-1>', self.on_double_click)

        scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=self.tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.configure(yscrollcommand=scrollbar.set)

        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(20, 0))

        ttk.Button(button_frame, text="OK", command=self.ok_button, style='TButton').pack(side=tk.RIGHT, padx=(10, 0))
        ttk.Button(button_frame, text="Cancel", command=self.cancel_button, style='TButton').pack(side=tk.RIGHT)

        self.populate_root_directory()

    def populate_root_directory(self):
        path = self.path_var.get()
        self.tree.delete(*self.tree.get_children())
        abspath = os.path.abspath(path)
        root_node = self.tree.insert('', 'end', text=abspath, open=True)
        self.process_directory(root_node, abspath)

    def update_tree(self, event):
        self.process_directory(self.tree.focus(), self.tree.item(self.tree.focus())['text'])

    def process_directory(self, parent, path):
        for item in os.listdir(path):
            abspath = os.path.join(path, item)
            if os.path.isdir(abspath):
                node = self.tree.insert(parent, 'end', text=item, open=False)
                self.tree.insert(node, 'end')

    def on_double_click(self, event):
        item = self.tree.selection()[0]
        self.path_var.set(self.tree.item(item, "text"))

    def browse_button(self):
        self.populate_root_directory()

    def ok_button(self):
        self.result = self.path_var.get()
        self.top.destroy()

    def cancel_button(self):
        self.result = None
        self.top.destroy()