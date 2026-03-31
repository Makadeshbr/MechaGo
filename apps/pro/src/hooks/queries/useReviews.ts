import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface CreateReviewInput {
  serviceRequestId: string;
  toUserId: string;
  rating: number;
  tags: string[];
  comment?: string;
}

interface ReviewResponse {
  id: string;
  serviceRequestId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: string;
}

interface ProfessionalReviewsResponse {
  professionalUserId: string;
  averageRating: number | null;
  totalReviews: number;
  reviews: ReviewResponse[];
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateReviewInput) => {
      const response = await api.post("reviews", { json: data });
      return response.json<ReviewResponse>();
    },
    onSuccess: (_, { serviceRequestId }) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests", serviceRequestId] });
    },
  });
}

export function useProfessionalReviews(professionalUserId: string) {
  return useQuery({
    queryKey: ["reviews", "professional", professionalUserId],
    queryFn: async () => {
      const response = await api.get(`reviews/professional/${professionalUserId}`);
      return response.json<ProfessionalReviewsResponse>();
    },
    enabled: !!professionalUserId,
  });
}
