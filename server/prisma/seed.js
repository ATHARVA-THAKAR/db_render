// Seeds realistic demo data: donors, receivers, an admin, and a
// spread of donations/requests across pending/approved/matched states
// so the app looks alive on first run instead of an empty database.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const admin = await prisma.user.create({
    data: { name: "Seva Sahayog Admin", email: "admin@sevasahayog.org", passwordHash, role: "admin" },
  });

  const donors = await Promise.all(
    [
      { name: "Aarav Mehta", email: "aarav.donor@example.com", orgName: "Mehta Textiles Pvt Ltd" },
      { name: "Priya Sharma", email: "priya.donor@example.com" },
      { name: "TechCorp CSR Team", email: "csr@techcorp.example.com", orgName: "TechCorp India" },
    ].map((d) => prisma.user.create({ data: { ...d, passwordHash, role: "donor" } }))
  );

  const receivers = await Promise.all(
    [
      { name: "Asha Old Age Home", email: "contact@ashahome.example.org", orgName: "Asha Old Age Home" },
      { name: "Vidya Bal Shiksha Kendra", email: "admin@vidyaschool.example.org", orgName: "Vidya Bal Shiksha Kendra" },
      { name: "Hope Hostel for Girls", email: "office@hopehostel.example.org", orgName: "Hope Hostel for Girls" },
    ].map((r) => prisma.user.create({ data: { ...r, passwordHash, role: "receiver" } }))
  );

  const donationSeeds = [
    { donorId: donors[0].id, category: "clothing", title: "200 winter blankets", description: "Brand new fleece blankets, unused stock from our warehouse.", quantity: 200, status: "approved", region: "Maharashtra", location: "Mumbai" },
    { donorId: donors[1].id, category: "books", title: "150 school textbooks (grade 1-5)", description: "Gently used NCERT textbooks in good condition.", quantity: 150, status: "matched", region: "Maharashtra", location: "Pune" },
    { donorId: donors[2].id, category: "electronics", title: "20 refurbished laptops", description: "Corporate CSR donation of refurbished laptops for student use.", quantity: 20, status: "approved", region: "Karnataka", location: "Bengaluru" },
    { donorId: donors[0].id, category: "food", title: "500kg rice and pulses", description: "Non-perishable food grains for distribution.", quantity: 500, status: "pending_review", region: "Maharashtra", location: "Mumbai" },
  ];
  const donations = await Promise.all(donationSeeds.map((d) => prisma.donation.create({ data: d })));

  const requestSeeds = [
    { receiverId: receivers[0].id, category: "clothing", title: "Blankets for 60 residents", description: "Winter is approaching and our residents need warm blankets.", quantity: 60, urgency: 4, status: "approved", region: "Maharashtra", location: "Mumbai" },
    { receiverId: receivers[1].id, category: "books", title: "Textbooks for 120 students", description: "New academic year starting, need textbooks grade 1-5.", quantity: 120, urgency: 5, status: "matched", region: "Maharashtra", location: "Pune" },
    { receiverId: receivers[2].id, category: "electronics", title: "Laptops for computer lab", description: "Setting up a computer literacy lab for 25 students.", quantity: 15, urgency: 3, status: "approved", region: "Karnataka", location: "Bengaluru" },
    { receiverId: receivers[0].id, category: "food", title: "Monthly grocery support", description: "Ongoing food support needed for 40 elderly residents.", quantity: 300, urgency: 4, status: "pending_review", region: "Maharashtra", location: "Mumbai" },
  ];
  const requests = await Promise.all(requestSeeds.map((r) => prisma.request.create({ data: r })));

  // One completed match (books) + one suggested match (blankets) to
  // demonstrate the full lifecycle.
  await prisma.match.create({
    data: {
      donationId: donations[1].id,
      requestId: requests[1].id,
      score: 0.91,
      scoreBreakdown: { quantityFit: 0.9, location: 1, urgency: 1, recency: 0.8 },
      status: "approved",
      approvedBy: admin.id,
    },
  });
  await prisma.match.create({
    data: {
      donationId: donations[0].id,
      requestId: requests[0].id,
      score: 0.83,
      scoreBreakdown: { quantityFit: 0.8, location: 1, urgency: 0.8, recency: 0.9 },
      status: "suggested",
    },
  });

  await prisma.moderationLog.createMany({
    data: [
      { targetType: "donation", targetId: donations[3].id, verdict: "needs_review", flaggedTerms: [] },
      { targetType: "request", targetId: requests[3].id, verdict: "needs_review", flaggedTerms: [] },
    ],
  });

  console.log("Seed complete:", {
    users: 1 + donors.length + receivers.length,
    donations: donations.length,
    requests: requests.length,
  });
  console.log("Demo login: admin@sevasahayog.org / Password123! (all seeded users share this password)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
