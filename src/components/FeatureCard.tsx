import { Users, Award, Calendar, Briefcase } from 'lucide-react';

export const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
      <Icon className="w-12 h-12 text-blue-600 mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export const FeatureGrid = () => {
  const features = [
    {
      icon: Users,
      title: "Mentor Matching",
      description: "Get matched with experienced mentors in your field of interest"
    },
    {
      icon: Award,
      title: "Skill Endorsements",
      description: "Showcase your skills and get endorsed by peers and mentors"
    },
    {
      icon: Calendar,
      title: "Events & Webinars",
      description: "Attend exclusive networking events and educational webinars"
    },
    {
      icon: Briefcase,
      title: "Job Referrals",
      description: "Access exclusive job opportunities through our network"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </div>
  );
};
