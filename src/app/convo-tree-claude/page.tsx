"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Simple types
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  messages: Message[];
}

// Tree node represents a point in the conversation
interface TreeNode {
  id: string;
  message: Message;
  children: TreeNode[];
  conversationIds: Set<string>; // Which conversations pass through this node
  parent: TreeNode | null;
}

// Sample conversations with branching
const sampleConversations: Conversation[] = [
  {
    id: "conv1",
    messages: [
      { role: "user", content: "What is the reason this works?" },
      { role: "assistant", content: "It works because of the underlying physics principles that govern the interaction between components." },
      { role: "user", content: "Can you be more specific?" },
      { role: "assistant", content: "The key is how forces are distributed across the structure, preventing any single point of failure." }
    ]
  },
  {
    id: "conv2",
    messages: [
      { role: "user", content: "What is the reason this works?" },
      { role: "assistant", content: "The mechanism relies on precise timing and coordination between multiple systems." },
      { role: "user", content: "Can you be more specific?" },
      { role: "assistant", content: "Each component triggers the next in a cascade, creating a smooth chain reaction." }
    ]
  },
  {
    id: "conv3",
    messages: [
      { role: "user", content: "What is the reason this works?" },
      { role: "assistant", content: "The design leverages fundamental engineering principles to achieve optimal performance." },
      { role: "user", content: "Can you be more specific?" },
      { role: "assistant", content: "It uses a combination of mechanical advantage and material properties to multiply force efficiently." }
    ]
  },
  {
    id: "conv4",
    messages: [
      { role: "user", content: "Why does this work?" },
      { role: "assistant", content: "It functions through careful balance of opposing forces that create stability." },
      { role: "user", content: "How stable is it really?" },
      { role: "assistant", content: "Very stable - the design has redundancy built in to handle variations." }
    ]
  },
  {
    id: "conv5",
    messages: [
      { role: "user", content: "Why does this work?" },
      { role: "assistant", content: "The design exploits natural properties of the materials used." },
      { role: "user", content: "How stable is it really?" },
      { role: "assistant", content: "Stability depends on environmental conditions but generally performs well." }
    ]
  },
  {
    id: "conv6",
    messages: [
      { role: "user", content: "Why does this work?" },
      { role: "assistant", content: "The system achieves its goals through redundancy and fail-safe mechanisms." },
      { role: "user", content: "What happens if something breaks?" },
      { role: "assistant", content: "Backup systems automatically engage to maintain operation without interruption." }
    ]
  },
  {
    id: "conv7",
    messages: [
      { role: "user", content: "How does it work?" },
      { role: "assistant", content: "A sensor detects input and triggers a response through the control system." },
      { role: "user", content: "What about edge cases?" },
      { role: "assistant", content: "Edge cases are handled by fallback mechanisms that prevent system failure." }
    ]
  },
  {
    id: "conv8",
    messages: [
      { role: "user", content: "How does it work?" },
      { role: "assistant", content: "The algorithm processes data through multiple layers of validation and transformation." },
      { role: "user", content: "What about edge cases?" },
      { role: "assistant", content: "Special handlers catch exceptions and route them through alternative processing paths." }
    ]
  }
];

// Build a proper conversation tree
function buildConversationTree(conversations: Conversation[]): TreeNode | null {
  if (conversations.length === 0) return null;

  // Create root node (invisible root to hold first messages)
  const root: TreeNode = {
    id: 'root',
    message: { role: "user", content: "" },
    children: [],
    conversationIds: new Set(conversations.map(c => c.id)),
    parent: null
  };

  // For each conversation, add its messages to the tree
  conversations.forEach(conversation => {
    let currentNode = root;

    conversation.messages.forEach((message, index) => {
      // Check if this message already exists as a child
      let existingChild = currentNode.children.find(
        child => child.message.content === message.content && child.message.role === message.role
      );

      if (existingChild) {
        // Message already exists, just add this conversation ID
        existingChild.conversationIds.add(conversation.id);
        currentNode = existingChild;
      } else {
        // Create new node for this message
        const newNode: TreeNode = {
          id: `${conversation.id}-${index}`,
          message,
          children: [],
          conversationIds: new Set([conversation.id]),
          parent: currentNode
        };
        currentNode.children.push(newNode);
        currentNode = newNode;
      }
    });
  });

  return root;
}

// Get the current path of messages based on selected nodes
function getCurrentPath(node: TreeNode | null): Message[] {
  const path: Message[] = [];
  let current = node;

  while (current && current.parent) {
    if (current.message.content) { // Skip root node
      path.unshift(current.message);
    }
    current = current.parent;
  }

  return path;
}

export default function ConvoTreeClaudePage() {
  const [navMode, setNavMode] = useState<"scroll" | "arrows">("arrows");
  const [conversations, setConversations] = useState<Conversation[]>(sampleConversations);

  const tree = useMemo(() => buildConversationTree(conversations), [conversations]);

  // Track the current selected node path
  const [currentNode, setCurrentNode] = useState<TreeNode | null>(tree);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);

  // Reset when conversations change
  useMemo(() => {
    setCurrentNode(tree);
    setSelectedChildIndex(0);
  }, [tree]);

  const currentPath = useMemo(() => {
    if (!currentNode) return [];
    return getCurrentPath(currentNode);
  }, [currentNode]);

  // Get the children of the current node (these are the options)
  const currentOptions = currentNode?.children || [];
  const hasOptions = currentOptions.length > 0;

  // Navigate to a child node
  const selectChild = (index: number) => {
    if (currentOptions[index]) {
      setCurrentNode(currentOptions[index]);
      setSelectedChildIndex(0);
    }
  };

  // Navigate back to parent
  const goBack = () => {
    if (currentNode?.parent && currentNode.parent.id !== 'root') {
      const parent = currentNode.parent;
      const indexInParent = parent.children.indexOf(currentNode);
      setCurrentNode(parent);
      setSelectedChildIndex(indexInParent);
    }
  };

  // Reset navigation
  const resetNavigation = () => {
    setCurrentNode(tree);
    setSelectedChildIndex(0);
  };

  const handleReset = () => {
    setConversations([]);
    setCurrentNode(null);
  };

  const handleLoadExample = () => {
    setConversations(sampleConversations);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 min-h-screen bg-gray-50">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Conversation Tree Claude</h1>
        <p className="text-gray-600">
          Navigate through conversation branches. Select a branch to explore that path.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={handleReset}
        >
          Reset Convo
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          onClick={handleLoadExample}
        >
          Load Example Convo
        </button>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${navMode === 'arrows' ? 'bg-blue-500 text-white' : 'bg-white'}`}
            onClick={() => setNavMode('arrows')}
          >
            Arrow Navigation
          </button>
          <button
            className={`px-4 py-2 rounded ${navMode === 'scroll' ? 'bg-blue-500 text-white' : 'bg-white'}`}
            onClick={() => setNavMode('scroll')}
          >
            Scroll Navigation
          </button>
        </div>
        {currentNode && currentNode.parent && currentNode.parent.id !== 'root' && (
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={goBack}
          >
            ← Go Back
          </button>
        )}
        {currentNode && currentNode.id !== tree?.id && (
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            onClick={resetNavigation}
          >
            ↑ Start Over
          </button>
        )}
      </div>

      {/* Display conversation path */}
      {conversations.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">No conversations loaded</p>
          <button
            className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={handleLoadExample}
          >
            Load Example Conversations
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Show current conversation path */}
          {currentPath.map((message, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                {message.role === 'user' ? 'User' : 'Assistant'} - Turn {index + 1}
              </h3>
              <p className="text-sm">{message.content}</p>
            </div>
          ))}

          {/* Show next options */}
          {hasOptions && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 shadow-sm">
              <h3 className="text-sm font-semibold text-blue-700 uppercase mb-3">
                Choose next {currentOptions[0].message.role === 'user' ? 'User' : 'Assistant'} message
                ({currentOptions.length} option{currentOptions.length !== 1 ? 's' : ''})
              </h3>

              {navMode === 'arrows' ? (
                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-lg border-2 border-blue-400">
                    <p className="text-sm">{currentOptions[selectedChildIndex]?.message.content}</p>
                  </div>
                  <div className="flex justify-center items-center gap-4">
                    <button
                      onClick={() => setSelectedChildIndex(Math.max(0, selectedChildIndex - 1))}
                      disabled={selectedChildIndex === 0}
                      className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                      Option {selectedChildIndex + 1} of {currentOptions.length}
                    </span>
                    <button
                      onClick={() => setSelectedChildIndex(Math.min(currentOptions.length - 1, selectedChildIndex + 1))}
                      disabled={selectedChildIndex === currentOptions.length - 1}
                      className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button
                      className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => selectChild(selectedChildIndex)}
                    >
                      Select This Option
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {currentOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectChild(idx)}
                      className="min-w-[280px] max-w-[280px] h-[80px] p-3 rounded-lg border text-left transition-all
                                 border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
                    >
                      <p className="text-sm line-clamp-3 overflow-hidden text-ellipsis">{option.message.content}</p>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Active in {currentOptions[selectedChildIndex]?.conversationIds.size || 0} conversation(s)
              </p>
            </div>
          )}

          {/* End of conversation indicator */}
          {!hasOptions && currentPath.length > 0 && (
            <div className="text-center p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">End of this conversation branch</p>
              <button
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={goBack}
              >
                Go Back to Explore Other Branches
              </button>
            </div>
          )}
        </div>
      )}

      {/* Debug info */}
      {conversations.length > 0 && currentNode && (
        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
          <p>Current node has {currentNode.children.length} branches</p>
          <p>This path exists in {currentNode.conversationIds.size} conversation(s)</p>
          <p>Total conversations loaded: {conversations.length}</p>
        </div>
      )}
    </div>
  );
}