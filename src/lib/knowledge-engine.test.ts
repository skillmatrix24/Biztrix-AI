import { searchPlatformKnowledge, getPlatformKnowledgePromptSummary } from "./knowledge-search";
import { advisorChat } from "@/ai/flows/advisor-chat-flow";
import { websiteChatbot } from "@/ai/flows/website-chatbot-flow";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("=== Testing Biztrix AI Knowledge Engine & Assistant Flows ===");

  // 1. Test thermal printer knowledge search
  const printerMatch = searchPlatformKnowledge("Thermal printer connect nahi ho raha ya print cut ho raha hai");
  assert(printerMatch.matched, "Thermal printer query matched knowledge base");
  assert(printerMatch.score >= 15, "Thermal printer query has strong matching score");
  assert(
    printerMatch.actions.some(a => a.route === "/settings"),
    "Thermal printer search includes /settings action route"
  );
  assert(printerMatch.stepByStepSOP.length > 0, "Thermal printer search provides step-by-step SOP steps");

  // 2. Test kacha bill / billing POS search
  const billMatch = searchPlatformKnowledge("Kacha bill ya thermal POS receipt kaise generate karein?");
  assert(billMatch.matched, "Billing POS query matched knowledge base");
  assert(
    billMatch.actions.some(a => a.route === "/billing"),
    "Billing POS search includes /billing route"
  );

  // 3. Test customer loyalty points search
  const loyaltyMatch = searchPlatformKnowledge("Customer loyalty card QR aur reward points check karna");
  assert(loyaltyMatch.matched, "Loyalty query matched knowledge base");
  assert(
    loyaltyMatch.actions.some(a => a.route === "/loyalty/track-member" || a.route === "/customers"),
    "Loyalty search includes /loyalty/track-member or /customers route"
  );

  // 4. Test staff role management search
  const roleMatch = searchPlatformKnowledge("Staff role manager permissions and attendance");
  assert(roleMatch.matched, "Staff & role query matched knowledge base");
  assert(
    roleMatch.actions.some(a => a.route === "/settings/roles" || a.route === "/staff"),
    "Staff role search includes /settings/roles or /staff route"
  );

  // 5. Test Solar EPC vertical search
  const solarMatch = searchPlatformKnowledge("Solar rooftop EPC survey aur proposal generator");
  assert(solarMatch.matched, "Solar EPC query matched knowledge base");
  assert(
    solarMatch.actions.some(a => a.route === "/solar"),
    "Solar search includes /solar route"
  );

  // 5b. Test workflow query: "Solar Management MANGEMENT SYSTEM KAISE KAM KARTA HAI"
  const solarWorkflow = searchPlatformKnowledge("Solar Management MANGEMENT SYSTEM KAISE KAM KARTA HAI");
  assert(solarWorkflow.matched, "Solar Management workflow query matched");
  assert(solarWorkflow.issue === undefined, "Workflow query must NOT trigger a troubleshooting issue");
  assert(solarWorkflow.answerHinglish.includes("Kaise Kaam Karta Hai"), "Workflow response includes step-by-step workflow");
  assert(!solarWorkflow.answerHinglish.includes("Samasya:"), "Workflow response must not include Samasya/Problem error box");

  // 6. Test platform knowledge prompt summary generator
  const promptSummary = getPlatformKnowledgePromptSummary();
  assert(promptSummary.length > 500, "Knowledge prompt summary contains extensive documentation");
  assert(promptSummary.includes("/billing") && promptSummary.includes("/settings"), "Prompt summary includes core route paths");

  // 7. Test advisorChat with platform how-to query (offline / local fallback resilience)
  const advisorResponse = await advisorChat({
    message: "Thermal printer kaise setup karein?",
    context: {
      businessName: "Test Store",
      products: [],
      leads: [],
      tasks: [],
      projects: []
    }
  });
  assert(Boolean(advisorResponse && advisorResponse.content), "advisorChat returns content for platform how-to query");
  assert(
    Array.isArray(advisorResponse.actions) && advisorResponse.actions.length > 0,
    "advisorChat returns clickable actions"
  );
  assert(
    advisorResponse.actions?.some(a => a.route === "/settings"),
    "advisorChat returns /settings navigation route for printer query"
  );

  // 8. Test advisorChat with live business inventory query
  const stockAdvisorResponse = await advisorChat({
    message: "Kaunsa stock khatam ho raha hai?",
    context: {
      businessName: "Super Mart",
      products: [
        { name: "Atta 10kg", stock: 2, minThreshold: 5, price: 380 },
        { name: "Basmati Rice", stock: 50, minThreshold: 10, price: 900 }
      ],
      leads: [],
      tasks: [],
      projects: []
    }
  });
  assert(
    stockAdvisorResponse.content.includes("Atta 10kg"),
    "advisorChat correctly identifies low-stock items from context"
  );
  assert(
    stockAdvisorResponse.actions?.some(a => a.route === "/inventory"),
    "advisorChat provides direct route to /inventory for low stock alert"
  );

  // 9. Test websiteChatbot with customer journey question
  const chatbotResponse = await websiteChatbot({
    message: "Customer apni loyalty membership kaise check karega?"
  });
  assert(Boolean(chatbotResponse && chatbotResponse.content), "websiteChatbot returns content for loyalty membership");
  assert(
    Array.isArray(chatbotResponse.actions) && chatbotResponse.actions.length > 0,
    "websiteChatbot returns navigation actions"
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
