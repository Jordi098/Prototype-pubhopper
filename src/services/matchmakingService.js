import { MOCK_GROUPS } from '../data/pubHopperData';

export async function findMatchingGroups(setup) {
  await new Promise((resolve) => setTimeout(resolve, 700));

  if (!setup?.interests?.length) return [];

  const sameTimeGroups = MOCK_GROUPS.filter((group) => group.startTime === setup.startTime);
  const groupsToScore = sameTimeGroups.length ? sameTimeGroups : MOCK_GROUPS;

  return groupsToScore
    .map((group) => {
      const sharedInterests = group.interests.filter((interest) => setup.interests.includes(interest));
      const sizeFit = Math.max(0, 10 - Math.abs(group.size - setup.groupSize) * 2);
      const timeFit = group.startTime === setup.startTime ? 12 : 0;
      return {
        ...group,
        sharedInterests: sharedInterests.length ? sharedInterests : ['open to meet'],
        matchScore: Math.min(99, 60 + sharedInterests.length * 8 + sizeFit + timeFit),
        fallbackMatch: sharedInterests.length === 0,
      };
    })
    .filter((group) => group.startTime === setup.startTime || sameTimeGroups.length === 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
