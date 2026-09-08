"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { landingConfig, FeaturedCourseItem } from "@/config/landing.config";
import { BookOpen, Clock, FileCheck2, ArrowRight } from "lucide-react";

export interface FeaturedCoursesProps {
  onSelectCourse: (course: FeaturedCourseItem) => void;
}

export function FeaturedCourses({ onSelectCourse }: FeaturedCoursesProps) {
  const { featuredCourses } = landingConfig;

  return (
    <section id="courses" className="py-16 md:py-24">
      <Container size="xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="peach" size="md">Structured Curriculum</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
              Featured Academic Courses
            </h2>
            <p className="text-base text-brand-text-muted leading-relaxed">
              In-depth, concept-driven batches designed for complete syllabus mastery and board exam excellence.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featuredCourses.map((course) => (
            <Card
              key={course.id}
              interactive
              className="bg-brand-surface border-brand-border hover:border-brand-orange-border/70 p-6 sm:p-7 flex flex-col justify-between transition-all duration-200"
            >
              <CardHeader className="p-0 space-y-3.5">
                {/* Board & Subject Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary" size="sm">
                    {course.board}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    {course.classLevel}
                  </Badge>
                  <Badge variant="peach" size="sm">
                    {course.subject}
                  </Badge>
                  {course.isPopular && (
                    <Badge variant="default" size="sm" className="ml-auto bg-brand-charcoal text-white">
                      Popular Batch
                    </Badge>
                  )}
                </div>

                {/* Course Title */}
                <CardTitle className="text-xl font-bold text-brand-text-primary leading-snug">
                  {course.title}
                </CardTitle>

                {/* Course Description */}
                <CardDescription className="text-sm text-brand-text-muted leading-relaxed">
                  {course.description}
                </CardDescription>
              </CardHeader>

              {/* Course Meta Info */}
              <CardContent className="p-0 mt-6 pt-4 border-t border-brand-border-subtle">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-brand-bg-warm p-2.5">
                    <Clock className="h-4 w-4 text-brand-orange mx-auto mb-1" />
                    <p className="text-[10px] text-brand-text-muted">Duration</p>
                    <p className="text-xs font-bold text-brand-text-primary mt-0.5 truncate">{course.duration}</p>
                  </div>
                  <div className="rounded-lg bg-brand-bg-warm p-2.5">
                    <BookOpen className="h-4 w-4 text-brand-orange mx-auto mb-1" />
                    <p className="text-[10px] text-brand-text-muted">Live & Videos</p>
                    <p className="text-xs font-bold text-brand-text-primary mt-0.5">{course.lessonsCount} Lessons</p>
                  </div>
                  <div className="rounded-lg bg-brand-bg-warm p-2.5">
                    <FileCheck2 className="h-4 w-4 text-brand-orange mx-auto mb-1" />
                    <p className="text-[10px] text-brand-text-muted">Assessments</p>
                    <p className="text-xs font-bold text-brand-text-primary mt-0.5">{course.testsCount} Tests</p>
                  </div>
                </div>
              </CardContent>

              {/* Action */}
              <CardFooter className="p-0 mt-6 border-0">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => onSelectCourse(course)}
                  className="w-full justify-center font-bold text-brand-text-primary hover:text-brand-orange hover:border-brand-orange"
                >
                  View Course Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
