import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./button"

export function Pagination({ 
  limit, 
  offset, 
  onNext, 
  onPrevious, 
  hasMore = true,
  isLoading = false 
}) {
  const page = Math.floor(offset / limit) + 1;

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-gray-500">
        Page <span className="font-medium text-gray-900">{page}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={offset === 0 || isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasMore || isLoading}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
