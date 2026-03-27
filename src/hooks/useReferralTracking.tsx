import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to track referral codes from URL and process referrals
 */
export function useReferralTracking() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      // Store referral code in localStorage for later use during registration
      localStorage.setItem("referral_code", refCode.toUpperCase());
    }
  }, [searchParams]);

  /**
   * Process referral after successful registration
   */
  const processReferral = async (newUserId: string, userType: "client" | "freelancer") => {
    const refCode = localStorage.getItem("referral_code");
    if (!refCode) return;

    try {
      // Find the referrer by code
      const { data: referral, error: findError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referral_code", refCode)
        .eq("referred_id", null) // Only match base referral record
        .limit(1);

      if (findError || !referral || referral.length === 0) {
        console.log("Referral code not found:", refCode);
        return;
      }

      const referrerRecord = referral[0];

      // Create a new referral completion record
      const { error: insertError } = await supabase
        .from("referrals")
        .insert({
          referrer_id: referrerRecord.referrer_id,
          referrer_type: referrerRecord.referrer_type,
          referral_code: refCode,
          referred_id: newUserId,
          status: "completed",
          completed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error creating referral record:", insertError);
        return;
      }

      // Update referral rewards for the referrer
      const { data: existingReward } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("user_id", referrerRecord.referrer_id)
        .eq("user_type", referrerRecord.referrer_type)
        .single();

      if (existingReward) {
        // Update existing reward record
        const newCount = (existingReward.referral_count || 0) + 1;
        
        // Check if eligible for reward based on type
        let newRewardsEarned = existingReward.rewards_earned || 0;
        const requiredReferrals = referrerRecord.referrer_type === "client" ? 10 : 50;
        
        if (newCount % requiredReferrals === 0) {
          newRewardsEarned += 1;
          
          // Add credits/cash to referrer
          if (referrerRecord.referrer_type === "client") {
            // Add 5 credits for clients
            await addCreditsToClient(referrerRecord.referrer_id, 5, "مكافأة الإحالات - 10 إحالات مكتملة");
          } else {
            // Add $5 (wallet) for freelancers
            await addCashToFreelancer(referrerRecord.referrer_id, 240, "مكافأة الإحالات - 50 إحالة مكتملة ($5)");
          }
        }

        await supabase
          .from("referral_rewards")
          .update({
            referral_count: newCount,
            rewards_earned: newRewardsEarned,
            last_reward_at: newCount % requiredReferrals === 0 ? new Date().toISOString() : existingReward.last_reward_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingReward.id);
      } else {
        // Create new reward record
        await supabase
          .from("referral_rewards")
          .insert({
            user_id: referrerRecord.referrer_id,
            user_type: referrerRecord.referrer_type,
            referral_count: 1,
            rewards_earned: 0,
          });
      }

      // Clear the stored referral code
      localStorage.removeItem("referral_code");
      
      toast({
        title: "تم تسجيلك عبر إحالة! 🎉",
        description: "تم تسجيل إحالتك بنجاح",
      });
    } catch (error) {
      console.error("Error processing referral:", error);
    }
  };

  return { processReferral };
}

/**
 * Add credits to client's subscription
 */
async function addCreditsToClient(userId: string, credits: number, reason: string) {
  try {
    // Get current subscription
    const { data: subscription } = await supabase
      .from("client_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (subscription) {
      await supabase
        .from("client_subscriptions")
        .update({
          credits_remaining: (subscription.credits_remaining || 0) + credits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
    }

    // Record in credits ledger
    const currentBalance = subscription?.credits_remaining || 0;
    await supabase
      .from("credits_ledger")
      .insert({
        user_id: userId,
        type: "referral_bonus",
        amount: credits,
        balance_after: currentBalance + credits,
        reason,
        reference_type: "referral",
      });

    // Send notification
    await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "reward",
        title: "مكافأة إحالة! 🎁",
        body: `تم إضافة ${credits} كريديت لحسابك كمكافأة إحالات`,
        reference_type: "referral",
      });
  } catch (error) {
    console.error("Error adding credits to client:", error);
  }
}

/**
 * Add cash to freelancer's wallet
 */
async function addCashToFreelancer(userId: string, amountEGP: number, reason: string) {
  try {
    // Get current wallet balance
    const { data: lastTransaction } = await supabase
      .from("credits_ledger")
      .select("balance_after")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const currentBalance = lastTransaction?.balance_after || 0;

    // Add to wallet
    await supabase
      .from("credits_ledger")
      .insert({
        user_id: userId,
        type: "referral_bonus",
        amount: amountEGP,
        balance_after: currentBalance + amountEGP,
        reason,
        reference_type: "referral",
      });

    // Update freelancer total_earnings
    const { data: freelancerProfile } = await supabase
      .from("freelancer_profiles")
      .select("total_earnings")
      .eq("user_id", userId)
      .single();

    if (freelancerProfile) {
      await supabase
        .from("freelancer_profiles")
        .update({
          total_earnings: (freelancerProfile.total_earnings || 0) + amountEGP,
        })
        .eq("user_id", userId);
    }

    // Send notification
    await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "reward",
        title: "مكافأة إحالة! 💰",
        body: `تم إضافة ${amountEGP} ج.م لمحفظتك كمكافأة إحالات ($5)`,
        reference_type: "referral",
      });
  } catch (error) {
    console.error("Error adding cash to freelancer:", error);
  }
}
