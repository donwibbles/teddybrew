import "dotenv/config";
import { CommunityType, MemberRole, RSVPStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Seed issue tags (idempotent - safe to rerun)
 */
async function seedIssueTags() {
  console.log("🏷️  Seeding issue tags...");

  const issueTags = [
    { slug: "healthcare", name: "Healthcare", sortOrder: 1 },
    { slug: "environment-climate", name: "Environment & Climate", sortOrder: 2 },
    { slug: "economy-jobs", name: "Economy & Jobs", sortOrder: 3 },
    { slug: "education", name: "Education", sortOrder: 4 },
    { slug: "housing", name: "Housing", sortOrder: 5 },
    { slug: "immigration", name: "Immigration", sortOrder: 6 },
    { slug: "voting-rights", name: "Voting Rights", sortOrder: 7 },
    { slug: "criminal-justice", name: "Criminal Justice Reform", sortOrder: 8 },
    { slug: "gun-safety", name: "Gun Safety", sortOrder: 9 },
    { slug: "reproductive-rights", name: "Reproductive Rights", sortOrder: 10 },
    { slug: "lgbtq-rights", name: "LGBTQ+ Rights", sortOrder: 11 },
    { slug: "labor-workers", name: "Labor & Workers Rights", sortOrder: 12 },
    { slug: "social-security-medicare", name: "Social Security & Medicare", sortOrder: 13 },
    { slug: "foreign-policy", name: "Foreign Policy", sortOrder: 14 },
    { slug: "civil-rights", name: "Civil Rights", sortOrder: 15 },
  ];

  for (const tag of issueTags) {
    await prisma.issueTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, sortOrder: tag.sortOrder },
      create: tag,
    });
  }

  console.log(`✅ Seeded ${issueTags.length} issue tags`);
}

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  await prisma.rSVP.deleteMany();
  await prisma.event.deleteMany();
  await prisma.member.deleteMany();
  await prisma.community.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // Create 10 users
  console.log("👥 Creating users...");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alice Chen",
        email: "alice@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=1",
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob Martinez",
        email: "bob@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=3",
      },
    }),
    prisma.user.create({
      data: {
        name: "Carol Kim",
        email: "carol@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=5",
      },
    }),
    prisma.user.create({
      data: {
        name: "David Johnson",
        email: "david@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=7",
      },
    }),
    prisma.user.create({
      data: {
        name: "Emma Wilson",
        email: "emma@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=9",
      },
    }),
    prisma.user.create({
      data: {
        name: "Frank Lopez",
        email: "frank@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=11",
      },
    }),
    prisma.user.create({
      data: {
        name: "Grace Taylor",
        email: "grace@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=13",
      },
    }),
    prisma.user.create({
      data: {
        name: "Henry Brown",
        email: "henry@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=15",
      },
    }),
    prisma.user.create({
      data: {
        name: "Iris Patel",
        email: "iris@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=17",
      },
    }),
    prisma.user.create({
      data: {
        name: "Jack Thompson",
        email: "jack@example.com",
        emailVerified: new Date(),
        image: "https://i.pravatar.cc/150?img=19",
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create 3 communities
  console.log("🏘️  Creating communities...");

  const techCommunity = await prisma.community.create({
    data: {
      slug: "tech-innovators",
      name: "Tech Innovators",
      description: "A community for developers, designers, and tech enthusiasts to share knowledge and collaborate on innovative projects.",
      type: CommunityType.PUBLIC,
      ownerId: users[0].id, // Alice owns this community
    },
  });

  const bookClub = await prisma.community.create({
    data: {
      slug: "book-lovers-unite",
      name: "Book Lovers Unite",
      description: "Join us for monthly book discussions, author meetups, and literary adventures. All genres welcome!",
      type: CommunityType.PUBLIC,
      ownerId: users[2].id, // Carol owns this community
    },
  });

  const fitnessGroup = await prisma.community.create({
    data: {
      slug: "morning-runners",
      name: "Morning Runners",
      description: "Early bird runners meeting for sunrise jogs and fitness challenges. Private group for committed members.",
      type: CommunityType.PRIVATE,
      ownerId: users[4].id, // Emma owns this community
    },
  });

  console.log(`✅ Created 3 communities`);

  // Add members to communities
  console.log("🤝 Adding members to communities...");

  // Tech Innovators members (owner + 5 members)
  await prisma.member.create({
    data: {
      userId: users[0].id, // Alice (owner)
      communityId: techCommunity.id,
      role: MemberRole.OWNER,
    },
  });
  await prisma.member.createMany({
    data: [
      { userId: users[1].id, communityId: techCommunity.id, role: MemberRole.MEMBER }, // Bob
      { userId: users[3].id, communityId: techCommunity.id, role: MemberRole.MEMBER }, // David
      { userId: users[5].id, communityId: techCommunity.id, role: MemberRole.MEMBER }, // Frank
      { userId: users[7].id, communityId: techCommunity.id, role: MemberRole.MEMBER }, // Henry
      { userId: users[9].id, communityId: techCommunity.id, role: MemberRole.MEMBER }, // Jack
    ],
  });

  // Book Lovers Unite members (owner + 4 members)
  await prisma.member.create({
    data: {
      userId: users[2].id, // Carol (owner)
      communityId: bookClub.id,
      role: MemberRole.OWNER,
    },
  });
  await prisma.member.createMany({
    data: [
      { userId: users[1].id, communityId: bookClub.id, role: MemberRole.MEMBER }, // Bob
      { userId: users[4].id, communityId: bookClub.id, role: MemberRole.MEMBER }, // Emma
      { userId: users[6].id, communityId: bookClub.id, role: MemberRole.MEMBER }, // Grace
      { userId: users[8].id, communityId: bookClub.id, role: MemberRole.MEMBER }, // Iris
    ],
  });

  // Morning Runners members (owner + 3 members)
  await prisma.member.create({
    data: {
      userId: users[4].id, // Emma (owner)
      communityId: fitnessGroup.id,
      role: MemberRole.OWNER,
    },
  });
  await prisma.member.createMany({
    data: [
      { userId: users[0].id, communityId: fitnessGroup.id, role: MemberRole.MEMBER }, // Alice
      { userId: users[3].id, communityId: fitnessGroup.id, role: MemberRole.MEMBER }, // David
      { userId: users[7].id, communityId: fitnessGroup.id, role: MemberRole.MEMBER }, // Henry
    ],
  });

  console.log(`✅ Added members to communities`);

  // Create 5 events (mix of past and upcoming)
  console.log("📅 Creating events...");

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const twoWeeks = new Date(now);
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);

  // Create events with sessions
  const event1 = await prisma.event.create({
    data: {
      title: "AI & Machine Learning Workshop",
      description: "Hands-on workshop covering the fundamentals of AI and machine learning. Bring your laptop!",
      location: "Tech Hub, 123 Innovation St",
      capacity: 30,
      communityId: techCommunity.id,
      organizerId: users[0].id, // Alice
      sessions: {
        create: {
          startTime: nextWeek,
          endTime: new Date(nextWeek.getTime() + 3 * 60 * 60 * 1000), // 3 hours later
        },
      },
    },
    include: { sessions: true },
  });

  const event2 = await prisma.event.create({
    data: {
      title: "Discussing 'The Midnight Library'",
      description: "Our monthly book club meeting to discuss Matt Haig's bestseller. Tea and snacks provided!",
      location: "Cozy Corner Café, Downtown",
      capacity: 15,
      communityId: bookClub.id,
      organizerId: users[2].id, // Carol
      sessions: {
        create: {
          startTime: tomorrow,
          endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        },
      },
    },
    include: { sessions: true },
  });

  const event3 = await prisma.event.create({
    data: {
      title: "Saturday Morning 5K Run",
      description: "Weekly group run through the park. All fitness levels welcome!",
      location: "Central Park North Entrance",
      capacity: null, // Unlimited
      communityId: fitnessGroup.id,
      organizerId: users[4].id, // Emma
      sessions: {
        create: {
          startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000), // 1.5 hours later
        },
      },
    },
    include: { sessions: true },
  });

  const event4 = await prisma.event.create({
    data: {
      title: "React 19 Deep Dive",
      description: "Exploring the new features in React 19 with live coding examples. Past event.",
      location: "Online - Zoom link in description",
      capacity: 50,
      communityId: techCommunity.id,
      organizerId: users[5].id, // Frank
      sessions: {
        create: {
          startTime: lastWeek,
          endTime: new Date(lastWeek.getTime() + 2.5 * 60 * 60 * 1000), // 2.5 hours later
        },
      },
    },
    include: { sessions: true },
  });

  // Multi-session event (hackathon with two sessions)
  const event5 = await prisma.event.create({
    data: {
      title: "Hackathon: Build for Good",
      description: "48-hour hackathon focused on creating apps that make a positive social impact. Teams of 2-5 people.",
      location: "Innovation Lab, Suite 400",
      capacity: 40,
      communityId: techCommunity.id,
      organizerId: users[0].id, // Alice
      sessions: {
        create: [
          {
            title: "Day 1 - Kickoff",
            startTime: twoWeeks,
            endTime: new Date(twoWeeks.getTime() + 12 * 60 * 60 * 1000), // 12 hours
          },
          {
            title: "Day 2 - Presentations",
            startTime: new Date(twoWeeks.getTime() + 24 * 60 * 60 * 1000),
            endTime: new Date(twoWeeks.getTime() + 48 * 60 * 60 * 1000), // 48 hours total
          },
        ],
      },
    },
    include: { sessions: true },
  });

  console.log(`✅ Created 5 events with sessions`);

  // Create RSVPs (using session IDs)
  console.log("✋ Creating RSVPs...");

  // Event 1 RSVPs (AI Workshop)
  await prisma.rSVP.createMany({
    data: [
      { userId: users[1].id, sessionId: event1.sessions[0].id, status: RSVPStatus.GOING }, // Bob
      { userId: users[3].id, sessionId: event1.sessions[0].id, status: RSVPStatus.GOING }, // David
      { userId: users[5].id, sessionId: event1.sessions[0].id, status: RSVPStatus.GOING }, // Frank
      { userId: users[7].id, sessionId: event1.sessions[0].id, status: RSVPStatus.GOING }, // Henry
      { userId: users[9].id, sessionId: event1.sessions[0].id, status: RSVPStatus.NOT_GOING }, // Jack
    ],
  });

  // Event 2 RSVPs (Book Club)
  await prisma.rSVP.createMany({
    data: [
      { userId: users[1].id, sessionId: event2.sessions[0].id, status: RSVPStatus.GOING }, // Bob
      { userId: users[4].id, sessionId: event2.sessions[0].id, status: RSVPStatus.GOING }, // Emma
      { userId: users[6].id, sessionId: event2.sessions[0].id, status: RSVPStatus.GOING }, // Grace
      { userId: users[8].id, sessionId: event2.sessions[0].id, status: RSVPStatus.NOT_GOING }, // Iris
    ],
  });

  // Event 3 RSVPs (5K Run)
  await prisma.rSVP.createMany({
    data: [
      { userId: users[0].id, sessionId: event3.sessions[0].id, status: RSVPStatus.GOING }, // Alice
      { userId: users[3].id, sessionId: event3.sessions[0].id, status: RSVPStatus.GOING }, // David
      { userId: users[7].id, sessionId: event3.sessions[0].id, status: RSVPStatus.GOING }, // Henry
    ],
  });

  // Event 4 RSVPs (Past event)
  await prisma.rSVP.createMany({
    data: [
      { userId: users[1].id, sessionId: event4.sessions[0].id, status: RSVPStatus.GOING }, // Bob
      { userId: users[3].id, sessionId: event4.sessions[0].id, status: RSVPStatus.GOING }, // David
      { userId: users[7].id, sessionId: event4.sessions[0].id, status: RSVPStatus.GOING }, // Henry
      { userId: users[9].id, sessionId: event4.sessions[0].id, status: RSVPStatus.GOING }, // Jack
    ],
  });

  // Event 5 RSVPs (Hackathon - multi-session, some users RSVP to both)
  await prisma.rSVP.createMany({
    data: [
      // Day 1 RSVPs
      { userId: users[1].id, sessionId: event5.sessions[0].id, status: RSVPStatus.GOING }, // Bob
      { userId: users[3].id, sessionId: event5.sessions[0].id, status: RSVPStatus.GOING }, // David
      { userId: users[5].id, sessionId: event5.sessions[0].id, status: RSVPStatus.GOING }, // Frank
      { userId: users[7].id, sessionId: event5.sessions[0].id, status: RSVPStatus.GOING }, // Henry
      { userId: users[9].id, sessionId: event5.sessions[0].id, status: RSVPStatus.GOING }, // Jack
      // Day 2 RSVPs (some overlap)
      { userId: users[1].id, sessionId: event5.sessions[1].id, status: RSVPStatus.GOING }, // Bob
      { userId: users[3].id, sessionId: event5.sessions[1].id, status: RSVPStatus.GOING }, // David
      { userId: users[5].id, sessionId: event5.sessions[1].id, status: RSVPStatus.GOING }, // Frank
    ],
  });

  console.log(`✅ Created RSVPs`);

  // Seed issue tags (idempotent)
  await seedIssueTags();

  console.log("\n🎉 Database seed completed successfully!\n");
  console.log("Summary:");
  console.log(`  • ${users.length} users`);
  console.log(`  • 3 communities (2 public, 1 private)`);
  console.log(`  • 5 events (4 upcoming, 1 past)`);
  console.log(`  • Multiple members per community`);
  console.log(`  • Multiple RSVPs per event`);
  console.log(`  • 15 issue tags\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
