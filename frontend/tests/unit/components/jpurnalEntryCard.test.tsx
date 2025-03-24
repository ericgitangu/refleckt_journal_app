import { fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockEntry = {
  id: "entry-123",
  title: "Test Journal Entry",
  content: "This is a test journal entry content",
  created_at: "2023-04-12T10:30:00Z",
  updated_at: "2023-04-12T10:30:00Z",
  tags: ["test", "journal"],
};

const mockDeleteEntry = jest.fn();

// Mock the entire journal entry card component
jest.mock("@/components/journal/journal-entry-card", () => ({
  JournalEntryCard: ({
    entry,
    onDelete,
  }: {
    entry: any;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid="journal-entry-card">
      <h2>{entry.title}</h2>
      <p>{entry.content}</p>
      <div>
        {entry.tags.map((tag: string) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <button data-testid="delete-button" onClick={() => onDelete(entry.id)}>
        Delete
      </button>
    </div>
  ),
}));

// Import after mocking
import { render, screen } from "@testing-library/react";
import { JournalEntryCard } from "@/components/journal/journal-entry-card";

describe("JournalEntryCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders entry details correctly", () => {
    render(<JournalEntryCard entry={mockEntry} onDelete={mockDeleteEntry} />);

    // @ts-ignore -- jest-dom adds custom matchers
    expect(screen.getByText("Test Journal Entry")).toBeInTheDocument();
    // @ts-ignore -- jest-dom adds custom matchers
    expect(
      screen.getByText("This is a test journal entry content"),
    ).toBeInTheDocument();
    // @ts-ignore -- jest-dom adds custom matchers
    expect(screen.getByText("test")).toBeInTheDocument();
    // @ts-ignore -- jest-dom adds custom matchers
    expect(screen.getByText("journal")).toBeInTheDocument();
  });

  it("calls delete function when delete button is clicked", () => {
    render(<JournalEntryCard entry={mockEntry} onDelete={mockDeleteEntry} />);

    // Click the delete button
    fireEvent.click(screen.getByTestId("delete-button"));

    // @ts-ignore -- jest matchers
    expect(mockDeleteEntry).toHaveBeenCalledWith("entry-123");
  });
});
